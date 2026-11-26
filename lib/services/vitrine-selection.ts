import { prisma } from "@/lib/db";
import type { MonetizationScoreComponents } from "@/types/monetization";
import {
  getActiveCommercialEvents,
  type ActiveCommercialEvent,
} from "@/lib/services/commercial-calendar-engine";
import { calculateVitrineScore, type VitrineScoreResult } from "@/lib/services/vitrine-score";
import type { TrendDirection } from "@/lib/services/listing-trend";
import { loadPublicMerchantProduct, ensureCanonicalProductPublicSlug } from "@/lib/queries/public-product";
import {
  officialRankEvidence,
  searchRelevanceOnly,
  unknownSalesEvidence,
  type SalesEvidence,
} from "@/lib/services/commercial-intelligence/sales-evidence";
import { evaluateCommissionEvidence, type CommissionEvidence } from "@/lib/services/commercial-intelligence/commission-evidence";
import { evaluatePriceCompetitiveness, type PriceCompetitivenessEvidence } from "@/lib/services/commercial-intelligence/price-competitiveness";
import { fetchSiblingOffers, cheapestOffer } from "@/lib/services/commercial-intelligence/sibling-offers";
import { evaluateCommercialEligibility } from "@/lib/services/commercial-intelligence/eligibility";
import { listRegisteredMerchantListingIds, computeCorroborationBatch, registerCandidate } from "@/lib/services/commercial-intelligence/candidate-registry";
import { classifySufficiency } from "@/lib/services/commercial-intelligence/evidence-sufficiency";
import { evaluateAdPotentialHypothesis, type AdPotentialHypothesis } from "@/lib/services/commercial-intelligence/ad-potential-hypothesis";
import { evaluateDescriptionQuality } from "@/lib/services/commercial-intelligence/description-quality";
import { applyCategoryConcentrationCap } from "@/lib/services/commercial-intelligence/category-concentration";
import { auditCandidate, type AuditResult } from "@/lib/services/commercial-intelligence/commercial-audit";

/**
 * Vitrine Inteligente selection v3 (owner's authorization, 2026-11-19).
 * Split into two layers:
 *
 *  1. buildCommercialCandidatePool() — the shared "commercial engine"
 *     layer (section 9: "motor comercial central... independente dos
 *     módulos de publicidade"). Runs the real gates (dedup by commercial
 *     family, ad/affiliate eligibility, confirmed price) and computes
 *     every real evidence dimension for every survivor, as a flat pool —
 *     no grouping, no quotas, no Vitrine-specific opinion yet. This is
 *     what lib/services/commercial-intelligence/lab/* reuses to compare
 *     methodologies on the exact same candidate universe (owner's
 *     requirement, Lab section: "mesmo universo de candidatos").
 *  2. selectVitrineCandidates() — the Vitrine's OWN policy on top: score,
 *     classify into sazonal/recorrente/emergente, apply group quotas.
 */

export type VitrineGroupType = "sazonal" | "recorrente" | "emergente";

interface RawHighlightSignal {
  discoverySource: string | null;
  matchedEventId: string | null;
  matchedKeyword: string | null;
  categoryId: string | null;
}

export interface DiscardedCandidate {
  /** Null only for the rare family-level dedup discards that happen
   * before an individual listing is resolved to one id (duplicado_familia
   * on the SECOND occurrence still carries it; see buildCommercialCandidatePool).
   * Owner's requirement, 2026-11-20 ("Ordem de Execução", section 9): the
   * renewal job needs this to tell "genuinely invalid, remove now" apart
   * from "merely outranked this cycle, protected by minimum observation
   * time" — title-only matching was never reliable (two real products can
   * share a title). */
  merchantListingId: string | null;
  title: string;
  reason:
    | "sem_preco_confirmado"
    | "inelegivel_para_anuncio"
    | "duplicado_familia"
    | "preco_nao_confiavel"
    | "evidencia_insuficiente"
    | "descricao_inadequada"
    | "reprovado_auditoria";
  detail: string;
}

export interface CandidatePoolFunnel {
  foundInDatabase: number;
  afterDedup: number;
  discardedNoPrice: number;
  discardedIneligible: number;
  evaluated: number;
}

export interface PooledCandidate {
  merchantListingId: string;
  canonicalProductId: string;
  title: string;
  currentPrice: number;
  discoverySource: string | null;
  salesEvidence: SalesEvidence;
  commissionEvidence: CommissionEvidence;
  priceCompetitiveness: PriceCompetitivenessEvidence;
  qualitySignal: MonetizationScoreComponents["offerQuality"] | null;
  /** Full MonetizationScoreComponents, kept alongside qualitySignal so
   * the Commercial Intelligence Lab's legacy_v2 methodology (which
   * historically read this object directly) can be re-run honestly
   * against real data, not a stripped-down reconstruction. */
  monetizationComponents: MonetizationScoreComponents | null;
  matchedEvent: ActiveCommercialEvent | null;
  matchedKeyword: string | null;
  trendDirection: TrendDirection | null;
  vitrineClickCount: number;
  /** Distinct independent sourceTypes the CommercialCandidateRegistry has
   * for this exact externalId — never raw row count (owner's explicit
   * rule, 2026-11-19: "não contabilize informações provenientes da mesma
   * fonte original como evidências independentes"). */
  corroboration: { sources: string[]; count: number };
  /** Real Mercado Livre category id (MLB1051 etc.), when known — owner's
   * requirement, 2026-11-20 ("Auditoria Contínua", section 4): used only
   * to cap how many candidates from the SAME category can occupy
   * adjacent slots within a group (two kettlebell kits, two nativity
   * sets competing for the same purchase intent), never to penalize a
   * product on its own. Null is a real, reported state — never guessed. */
  categoryId: string | null;
}

export interface CandidatePoolResult {
  pool: PooledCandidate[];
  discarded: DiscardedCandidate[];
  funnel: CandidatePoolFunnel;
  activeEvents: { name: string; stage: string; daysUntilPeak: number }[];
}

function normalize(text: string): string {
  return text.toLowerCase().trim().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

/** The shared commercial-intelligence candidate pool — see file doc
 * comment.
 *
 * Owner's authorization, 2026-11-19 ("Aprovação condicionada — Motor
 * Central de Inteligência Comercial", section 1/2): this used to gate
 * entry on `monetizationScore.score !== null`, ordered by that same
 * score, taking a flat top-300 — a single criterion from the site's own
 * `/ofertas` pipeline, orthogonal to sales rank/seasonality/trend.
 * CONFIRMED live, 2026-11-19: of 385 real Black Friday official-rank
 * finds, 100% already had a monetizationScore, yet only 29 (7.5%) made
 * the old top-300 cut — the other 356 were never evaluated, not for lack
 * of merit, but because the gate measured something else entirely.
 *
 * Fixed: entry is now `lib/services/commercial-intelligence/
 * candidate-registry.ts`'s CommercialCandidateRegistry — any source
 * (official rank, trend keyword, seasonal keyword, price drop, sibling
 * competitiveness, the affiliate panel's own sections, or the legacy
 * monetizationScore itself as ONE MORE informational source) can put a
 * listing in front of evaluation with no other source's approval.
 * `monetizationScore` is still read below (and still drives the site's
 * own /ofertas ranking, completely untouched) — just never the gate.
 *
 * `poolSize` paginates the registry itself (cursor-based), not a single
 * flat cap — see listRegisteredMerchantListingIds. */
export async function buildCommercialCandidatePool(poolSize = 3000): Promise<CandidatePoolResult> {
  const activeEvents = getActiveCommercialEvents();
  const eventById = new Map(activeEvents.map((a) => [a.event.id, a]));

  const { merchantListingIds } = await listRegisteredMerchantListingIds({ take: poolSize });

  const listings = merchantListingIds.length
    ? await prisma.merchantListing.findMany({
        where: {
          id: { in: merchantListingIds },
          active: true,
          availability: { not: "OUT_OF_STOCK" },
          merchant: { code: "MERCADO_LIVRE" },
          canonicalProduct: { isNot: null },
        },
        select: {
          id: true,
          externalId: true,
          canonicalProductId: true,
          canonicalProduct: { select: { title: true, publicSlug: true, brand: true, model: true } },
          monetizationScore: { select: { components: true } },
          trend: { select: { direction: true } },
          signals: {
            where: { source: { in: ["mercado_livre_highlights", "panel_pick", "mercado_livre_catalog_items"] } },
            orderBy: { observedAt: "desc" },
            select: { source: true, raw: true, observedAt: true, bestsellerRank: true },
          },
        },
      })
    : [];
  const foundInDatabase = listings.length;
  const corroborationByExternalId = await computeCorroborationBatch(listings.map((l) => l.externalId));

  // Dedup, strongest signal first: canonical product id, then brand+model
  // family, then normalized title (ML's own catalog occasionally splits
  // the identical product across two ids — found live, 2026-11-19).
  const seenCanonical = new Set<string>();
  const seenFamily = new Set<string>();
  const seenTitle = new Set<string>();
  const titlesByBrand = new Map<string, string[]>();
  const discarded: DiscardedCandidate[] = [];
  const deduped = listings.filter((l) => {
    if (l.canonicalProductId) {
      if (seenCanonical.has(l.canonicalProductId)) {
        discarded.push({ merchantListingId: l.id, title: l.canonicalProduct?.title ?? "", reason: "duplicado_familia", detail: "Mesmo produto canônico já selecionado." });
        return false;
      }
      seenCanonical.add(l.canonicalProductId);
    }
    const brand = l.canonicalProduct?.brand ? normalize(l.canonicalProduct.brand) : null;
    const model = l.canonicalProduct?.model ? normalize(l.canonicalProduct.model) : null;
    if (brand && model) {
      const familyKey = `${brand}::${model}`;
      if (seenFamily.has(familyKey)) {
        discarded.push({ merchantListingId: l.id, title: l.canonicalProduct?.title ?? "", reason: "duplicado_familia", detail: `Mesma marca+modelo (${l.canonicalProduct!.brand} ${l.canonicalProduct!.model}) já selecionada — variação de cor/tensão/tamanho não ocupa vaga própria.` });
        return false;
      }
      seenFamily.add(familyKey);
    }
    const normalizedTitle = l.canonicalProduct?.title ? normalize(l.canonicalProduct.title) : null;
    if (normalizedTitle) {
      if (seenTitle.has(normalizedTitle)) {
        discarded.push({ merchantListingId: l.id, title: l.canonicalProduct?.title ?? "", reason: "duplicado_familia", detail: "Título idêntico já selecionado." });
        return false;
      }
      seenTitle.add(normalizedTitle);
    }
    // Owner's correction, 2026-11-19: found live — two real catalog
    // entries ("Whey Protein 3w 900g Whey Nutra Growth" and the same
    // title + "Baunilha") shared `brand="Nutra growth"` but `model` was
    // empty for both (the real ML attribute just wasn't present), so the
    // brand+model tier above never fired. When model is missing, fall
    // back to brand + a long shared title PREFIX (>=5 words) — a flavor/
    // color suffix tacked onto an otherwise identical title is the same
    // commercial family, never a second slot.
    if (brand && normalizedTitle) {
      const words = normalizedTitle.split(" ");
      const seenForBrand = titlesByBrand.get(brand) ?? [];
      const isPrefixDuplicate = seenForBrand.some((other) => {
        const otherWords = other.split(" ");
        const shared = Math.min(words.length, otherWords.length);
        if (shared < 5) return false;
        for (let i = 0; i < shared; i += 1) if (words[i] !== otherWords[i]) return false;
        return true;
      });
      if (isPrefixDuplicate) {
        discarded.push({
          merchantListingId: l.id,
          title: l.canonicalProduct?.title ?? "",
          reason: "duplicado_familia",
          detail: `Mesma marca (${l.canonicalProduct!.brand}) e título quase idêntico a um já selecionado — provável variação (sabor/cor/tamanho) do mesmo produto.`,
        });
        return false;
      }
      titlesByBrand.set(brand, [...seenForBrand, normalizedTitle]);
    }
    return true;
  });
  const afterDedup = deduped.length;

  const clickCounts = await prisma.affiliateClick.groupBy({
    by: ["merchantListingId"],
    where: { campaign: "vitrinedinamica", merchantListingId: { in: deduped.map((l) => l.id) } },
    _count: { _all: true },
  });
  const clicksByListing = new Map(clickCounts.map((c) => [c.merchantListingId, c._count._all]));

  const pool: PooledCandidate[] = [];
  let discardedIneligible = 0;
  let discardedNoPrice = 0;

  for (const listing of deduped) {
    const title = listing.canonicalProduct?.title ?? "";
    const canonicalProductId = listing.canonicalProductId;
    if (!canonicalProductId || !title) continue;

    const highlightSignal = listing.signals.find((s) => s.source === "mercado_livre_highlights");
    const panelSignal = listing.signals.find((s) => s.source === "panel_pick");
    const raw = (highlightSignal?.raw ?? null) as RawHighlightSignal | null;
    const position = highlightSignal?.bestsellerRank ?? null;

    // Gate 1: real confirmed price (generate the public slug first — a
    // fresh discovery has none yet, and every genuinely selected
    // candidate needs one anyway for its page/catalog entry to exist).
    const slug =
      listing.canonicalProduct?.publicSlug ??
      (await ensureCanonicalProductPublicSlug(canonicalProductId, title).catch(() => null));
    if (!slug) {
      discarded.push({ merchantListingId: listing.id, title, reason: "sem_preco_confirmado", detail: "Não foi possível gerar o slug público." });
      discardedNoPrice += 1;
      continue;
    }
    const product = await loadPublicMerchantProduct(slug).catch(() => null);
    if (!product || product.currentPrice === null) {
      discarded.push({ merchantListingId: listing.id, title, reason: "sem_preco_confirmado", detail: "Nenhuma oferta com preço confirmado encontrada para este anúncio." });
      discardedNoPrice += 1;
      continue;
    }

    // Shared real sibling-offer data for eligibility + competitiveness.
    const siblingOffers = await fetchSiblingOffers(canonicalProductId, listing.id);
    const representative = cheapestOffer(siblingOffers);

    // Gate 1b: price-anomaly check (owner's explicit requirement,
    // 2026-11-19, critical review: "valide preços anômalos"). Found
    // live: `loadPublicMerchantProduct` resolves price via the BEST
    // sibling offer when the canonical product has several real
    // MerchantListing rows (an established, site-wide, INTENTIONAL
    // pattern — reverted an earlier, overly strict "must have its own
    // price signal" gate here that wrongly rejected 91% of otherwise
    // legitimate candidates whose price correctly comes from a sibling).
    // The real problem was never "price from a sibling" — it's a price
    // wildly outside what the product's own real sibling offers show.
    // Only flag when there's an actual basis for comparison (>=1 real
    // sibling); never invent anomaly detection from nothing.
    if (siblingOffers.length > 0) {
      const siblingPrices = siblingOffers.map((o) => o.price).sort((a, b) => a - b);
      const median = siblingPrices[Math.floor(siblingPrices.length / 2)]!;
      if (median > 0 && (product.currentPrice > median * 3 || product.currentPrice < median / 3)) {
        discarded.push({
          merchantListingId: listing.id,
          title,
          reason: "preco_nao_confiavel",
          detail: `Preço exibido (R$ ${product.currentPrice.toFixed(2)}) é um outlier extremo frente às ${siblingOffers.length} oferta(s) reais do mesmo produto (mediana R$ ${median.toFixed(2)}).`,
        });
        discardedNoPrice += 1;
        continue;
      }
    }

    const eligibility = evaluateCommercialEligibility({
      title,
      sellerReputationLevel: representative?.sellerReputationLevel ?? null,
      condition: representative?.condition ?? null,
      hasConfirmedPrice: true,
    });
    if (!eligibility.eligible) {
      discarded.push({ merchantListingId: listing.id, title, reason: "inelegivel_para_anuncio", detail: eligibility.blockedReasons.join(" ") });
      discardedIneligible += 1;
      continue;
    }

    // Owner's finding, 2026-11-20 ("Auditoria Contínua", section 1/4):
    // real titles in Spanish ("Taza Termica... Vaca Lechera") and in
    // English ("Warm Snow Boots And Cotton Shoes For Women...") reached
    // the Vitrine — a real risk for ads aimed at a Brazilian audience,
    // never checked before this. A real rejection gate, same pattern as
    // the price-anomaly check above: only fires on >=2 distinct strong
    // non-Portuguese markers (see description-quality.ts's own doc
    // comment for why each word was chosen), never on a single
    // ambiguous/borrowed word.
    const descriptionQuality = evaluateDescriptionQuality(title);
    if (descriptionQuality.quality === "inadequada") {
      discarded.push({
        merchantListingId: listing.id,
        title,
        reason: "descricao_inadequada",
        detail: `Título com marcadores fortes de ${descriptionQuality.language === "es" ? "espanhol" : "inglês"} (${descriptionQuality.matchedMarkers.join(", ")}) — risco de confundir o comprador brasileiro e de parecer um anúncio de revenda/dropship.`,
      });
      discardedIneligible += 1;
      continue;
    }

    const priceCompetitiveness = evaluatePriceCompetitiveness({
      merchantListingId: listing.id,
      siblingOffers,
      thisPrice: product.currentPrice,
      priceHistory: product.priceHistory,
    });

    // These two are themselves independent CandidateCommercialRegistry
    // sources (owner's authorization, section 2) — a confirmed price
    // drop or a real multi-seller price comparison is evidence a
    // candidate deserves attention on its own, not only a scoring input.
    if (priceCompetitiveness.hasConfirmedPriceDrop) {
      await registerCandidate({
        externalId: listing.externalId,
        merchantListingId: listing.id,
        sourceType: "price_drop",
        sourceDetail: { headline: priceCompetitiveness.priceDropHeadline, thisPrice: product.currentPrice },
      });
    }
    if (priceCompetitiveness.competitivenessScore !== null && priceCompetitiveness.siblingOfferCount >= 2) {
      await registerCandidate({
        externalId: listing.externalId,
        merchantListingId: listing.id,
        sourceType: "sibling_competitiveness",
        sourceDetail: { score: priceCompetitiveness.competitivenessScore, siblingOfferCount: priceCompetitiveness.siblingOfferCount },
      });
    }

    // Seasonal relevance: thematic events trust a real keyword match;
    // promotional events require an actual confirmed price drop — being
    // merely in a scanned category is never enough.
    const candidateEvent = raw?.matchedEventId ? eventById.get(raw.matchedEventId) ?? null : null;
    const isSearchIndexPosition =
      raw?.discoverySource === "VITRINE_TRENDING" || (raw?.discoverySource === "VITRINE_SEASONAL" && Boolean(raw.matchedKeyword));
    const matchedEvent = candidateEvent
      ? candidateEvent.event.eventType === "tematico"
        ? raw?.matchedKeyword
          ? candidateEvent
          : null
        : priceCompetitiveness.hasConfirmedPriceDrop
          ? candidateEvent
          : null
      : null;

    const trendDirection = (listing.trend?.direction as TrendDirection | undefined) ?? null;
    const monetizationComponents = listing.monetizationScore?.components as MonetizationScoreComponents | undefined;

    const salesEvidence = !raw
      ? unknownSalesEvidence()
      : isSearchIndexPosition
        ? searchRelevanceOnly(raw.matchedKeyword ?? "?", position ?? 0)
        : position
          ? officialRankEvidence(position)
          : unknownSalesEvidence();

    const panelRaw = panelSignal?.raw as { rate?: number; extras?: boolean } | null;
    const commissionEvidence = evaluateCommissionEvidence({
      individualRate: panelRaw?.rate ?? null,
      individualCapturedAt: panelSignal?.observedAt ?? null,
      // Owner's correction, 2026-11-19: a real live read of the panel
      // confirmed "GANHOS EXTRAS X%" REPLACES the normal "GANHOS Y%"
      // badge (never shown together on the same item) — it IS the total
      // vigente rate while the promotion lasts, not an add-on. But it is
      // sponsor-funded and can end without notice, so it's still flagged
      // `isPromotionalExtra` rather than folded into "confirmed_individual"
      // — this field existed in every panel capture since September but
      // was never actually read until now.
      isPromotionalExtra: panelRaw?.extras ?? false,
      mlCategoryId: representative?.mlCategoryId ?? raw?.categoryId ?? null,
      currentPrice: product.currentPrice,
    });

    pool.push({
      merchantListingId: listing.id,
      canonicalProductId,
      title,
      currentPrice: product.currentPrice,
      discoverySource: raw?.discoverySource ?? null,
      salesEvidence,
      commissionEvidence,
      priceCompetitiveness,
      qualitySignal: monetizationComponents?.offerQuality ?? null,
      monetizationComponents: monetizationComponents ?? null,
      matchedEvent,
      matchedKeyword: raw?.matchedKeyword ?? null,
      trendDirection,
      vitrineClickCount: clicksByListing.get(listing.id) ?? 0,
      corroboration: corroborationByExternalId.get(listing.externalId) ?? { sources: [], count: 0 },
      categoryId: representative?.mlCategoryId ?? raw?.categoryId ?? null,
    });
  }

  return {
    pool,
    discarded,
    funnel: {
      foundInDatabase,
      afterDedup,
      discardedIneligible,
      discardedNoPrice,
      evaluated: pool.length,
    },
    activeEvents: activeEvents.map((a) => ({ name: a.event.name, stage: a.stage, daysUntilPeak: a.daysUntilPeak })),
  };
}

function classifyGroup(
  matchedEvent: ActiveCommercialEvent | null,
  trendDirection: TrendDirection | null,
  discoverySource: string | null,
): VitrineGroupType {
  if (matchedEvent) return "sazonal";
  if (trendDirection === "rising") return "emergente";
  if (discoverySource === "VITRINE_TRENDING") return "emergente";
  return "recorrente";
}

/** Owner's authorization, 2026-11-22 ("Corrigir a competição comercial"):
 * `group` is now a descriptive label only — why a candidate was found
 * (genuine seasonal relevance, a real rising trend, or the default
 * "recorrente") — never a reserved bucket with its own quota. See
 * pickGlobalVitrineSelection()'s own doc comment for the real root cause
 * this replaces: a rigid 12/12/6 split let a weak sazonal candidate
 * (rankingScore as low as 14) hold a guaranteed slot ahead of a far
 * stronger recorrente one (rankingScore 34+), because the two groups
 * never had to compete directly — confirmed live, 2026-11-22. */
const ALL_GROUP_TYPES: VitrineGroupType[] = ["sazonal", "recorrente", "emergente"];

export interface VitrineCandidate {
  merchantListingId: string;
  canonicalProductId: string;
  title: string;
  score: number;
  rankingScore: number;
  group: VitrineGroupType;
  reason: string;
  scoreBreakdown: VitrineScoreResult;
  matchedEventName: string | null;
  matchedKeyword: string | null;
  commissionEvidence: { type: string; rate: number | null; estimatedValueBrl: number | null; stale: boolean };
  priceCompetitiveness: { score: number | null; siblingOfferCount: number; hasConfirmedPriceDrop: boolean };
  adPotentialHypothesis: AdPotentialHypothesis;
  categoryId: string | null;
  commercialAudit: AuditResult;
  /** Owner's directive, 2026-11-21 ("Confirmar o significado de
   * salesEvidence"): the raw evidence TYPE (official_rank vs.
   * search_relevance_only vs. unknown — never confused with a sold
   * quantity), threaded through faithfully for round-candidate
   * persistence and any future panel display — never re-derived or
   * guessed from `scoreBreakdown`, which only carries the numeric score. */
  salesEvidenceType: SalesEvidence["type"];
}

/** Owner's authorization, 2026-11-22: descriptive composition of the
 * final selection by group label — `eligible` is how many real
 * candidates carried that label at all (before the global rank+
 * diversity pass), `selected` is how many actually made the final cut.
 * There is no `target`/`filled` anymore — a group is never owed a
 * minimum or maximum number of slots; it either has strong real
 * candidates or it doesn't, same bar as every other group. */
export interface GroupFillReport {
  group: VitrineGroupType;
  eligible: number;
  selected: number;
  reason: string | null;
}

export interface VitrineSelectionResult {
  candidates: VitrineCandidate[];
  /** Owner's correction, 2026-11-20 ("Auditoria Contínua", section 4):
   * every candidate that passed the evidence-sufficiency gate, BEFORE
   * the top-30 cut — not just the winners. jobs/vitrine-renew.ts needs
   * this to refresh an ALREADY-ACTIVE product's score/evidence every
   * cycle even when it no longer makes the top 30, so the minimum-
   * observation/rotation-budget protection shields the product from
   * being RETIRED without ever shielding stale, pre-correction evidence
   * from being shown as if it were still current. Found live: a product
   * that fell out of the top 30 right when the stale-commission-discount
   * fix shipped kept displaying its OLD, undiscounted score indefinitely
   * — the protection had accidentally frozen the evidence itself, not
   * just the removal decision.
   */
  allScored: VitrineCandidate[];
  groupReport: GroupFillReport[];
  discarded: DiscardedCandidate[];
  funnel: CandidatePoolFunnel & { selected: number };
  activeEvents: { name: string; stage: string; daysUntilPeak: number }[];
}

export async function selectVitrineCandidates(limit = 30): Promise<VitrineSelectionResult> {
  // Owner's authorization, 2026-11-19: no more arbitrary bottleneck —
  // this used to pass `limit * 10` (300), silently overriding
  // buildCommercialCandidatePool's own, larger default (1000) and
  // undoing the whole point of widening the pool. Found live the same
  // day: a full cycle run reported foundInDatabase=275 despite the
  // registry holding 1496 real distinct candidates — traced to this
  // exact call still hardcoding the old cap.
  const { pool, discarded, funnel, activeEvents } = await buildCommercialCandidatePool();

  const byGroup: Record<VitrineGroupType, VitrineCandidate[]> = { sazonal: [], recorrente: [], emergente: [] };

  for (const c of pool) {
    const group = classifyGroup(c.matchedEvent, c.trendDirection, c.discoverySource);
    const breakdown = calculateVitrineScore({
      salesEvidence: c.salesEvidence,
      commissionEvidence: c.commissionEvidence,
      priceCompetitiveness: c.priceCompetitiveness,
      qualitySignal: c.qualitySignal,
      seasonalEvent: c.matchedEvent,
      trendDirection: c.trendDirection,
      vitrineClickCount: c.vitrineClickCount,
    });

    // Owner's authorization, 2026-11-19 ("Aprovação condicionada",
    // section 6 + the critical review the same day): "não permita que
    // uma comissão desatualizada seja o fundamento principal para
    // classificar um produto como campeão recorrente" + "não force o
    // preenchimento das 30 vagas quando não existirem evidências
    // suficientes." A candidate backed by 0-1 real dimensions (the exact
    // pattern behind the 6 "emergentes" that all scored an identical 100
    // off nothing but a 1-2-sibling price comparison) is REJECTED here,
    // for every group alike — never just labeled and let through.
    if (classifySufficiency(breakdown) === "insufficient") {
      discarded.push({
        merchantListingId: c.merchantListingId,
        title: c.title,
        reason: "evidencia_insuficiente",
        detail: `Só ${Object.values(breakdown.components).filter((v) => v.value !== null).length} dimensão(ões) real(is) de evidência — insuficiente para recomendar como oportunidade, mesmo com nota bruta ${breakdown.score}.`,
      });
      continue;
    }

    // Owner's correction, 2026-11-20 ("Ordem de Execução", priority 5): the
    // score already discounts a stale commission and evidence-sufficiency
    // already excludes it from the real-dimension count — but the
    // DISPLAYED reason could still pick it as reasons[0] purely because
    // of the components object's key order, whenever salesEvidence was
    // null. Found live: most "recorrente" entries read "comissão
    // desatualizada" as their headline reason, which a human reading it
    // reasonably takes as "that's the foundation" — never the intent. A
    // non-degraded reason is always preferred when one exists; the
    // degraded one is only shown when it's genuinely all there is.
    const nonDegradedReasons = breakdown.reasons.filter(
      (r) => !breakdown.degradedDimensions.some((d) => r.startsWith(`${d}:`)),
    );

    // Owner's requirement, 2026-11-20 ("Primeiro teste real da
    // Vitrine", item 1): "remova automaticamente... não dependa de
    // remoção manual." The independent audit now runs INSIDE selection,
    // not after — a candidate it reprova is discarded here, the same
    // way an ineligible or anomalous-priced one already is, so a
    // reprovado product never occupies a slot in the first place and
    // the next best real candidate (or the group's honest fill report,
    // never a forced vaga) takes its place automatically next cycle.
    const commercialAudit = auditCandidate({
      breakdown,
      group,
      descriptionQuality: "adequada", // already gated above — descricao_inadequada never reaches this point
      priceCompetitivenessSampleSize: c.priceCompetitiveness.siblingOfferCount,
      hasConfirmedPriceDrop: c.priceCompetitiveness.hasConfirmedPriceDrop,
      commissionType: c.commissionEvidence.type,
      staleNotRecomputedThisCycle: false,
    });
    if (commercialAudit.verdict === "reprovado") {
      discarded.push({
        merchantListingId: c.merchantListingId,
        title: c.title,
        reason: "reprovado_auditoria",
        detail: commercialAudit.reasons.join(" "),
      });
      continue;
    }

    const reason = c.matchedEvent
      ? c.matchedEvent.event.eventType === "tematico"
        ? `Encontrado buscando "${c.matchedKeyword}" para ${c.matchedEvent.event.name} (${c.matchedEvent.stage}, pico em ${c.matchedEvent.daysUntilPeak}d).`
        : `Oportunidade de ${c.matchedEvent.event.name}: ${c.priceCompetitiveness.priceDropHeadline} (categoria bestseller real, não por palavra-chave no título).`
      : group === "emergente"
        ? `Achado via palavra-chave em alta no próprio Mercado Livre: "${c.matchedKeyword}".`
        : nonDegradedReasons[0] ?? breakdown.reasons[0] ?? "Pontuação multifatorial calculada.";

    byGroup[group].push({
      merchantListingId: c.merchantListingId,
      canonicalProductId: c.canonicalProductId,
      title: c.title,
      score: breakdown.score,
      rankingScore: breakdown.rankingScore,
      group,
      reason,
      scoreBreakdown: breakdown,
      matchedEventName: c.matchedEvent?.event.name ?? null,
      matchedKeyword: c.matchedKeyword,
      commissionEvidence: {
        type: c.commissionEvidence.type,
        rate: c.commissionEvidence.rate,
        estimatedValueBrl: c.commissionEvidence.estimatedValueBrl,
        stale: c.commissionEvidence.stale,
      },
      priceCompetitiveness: {
        score: c.priceCompetitiveness.competitivenessScore,
        siblingOfferCount: c.priceCompetitiveness.siblingOfferCount,
        hasConfirmedPriceDrop: c.priceCompetitiveness.hasConfirmedPriceDrop,
      },
      adPotentialHypothesis: evaluateAdPotentialHypothesis({
        title: c.title,
        currentPrice: c.currentPrice,
        hasConfirmedPriceDrop: c.priceCompetitiveness.hasConfirmedPriceDrop,
      }),
      categoryId: c.categoryId,
      commercialAudit,
      salesEvidenceType: c.salesEvidence.type,
    });
  }

  const allScored = Object.values(byGroup).flat();
  const activeEventNames = activeEvents.map((a) => a.name).join(", ") || "nenhum";
  const { picked, groupReport } = pickGlobalVitrineSelection(allScored, limit, activeEventNames);

  return {
    candidates: picked,
    allScored,
    groupReport,
    discarded,
    funnel: { ...funnel, selected: Math.min(picked.length, limit) },
    activeEvents,
  };
}

/** Owner's authorization, 2026-11-22 ("Corrigir a competição comercial —
 * substitua as cotas rígidas por uma classificação global baseada nas
 * evidências comerciais disponíveis"). Real root cause confirmed live
 * the same day: with the old per-group quota (12 sazonal / 12 recorrente
 * / 6 emergente, each filled independently), "recorrente" had 439 real
 * eligible candidates for only 12 slots while "sazonal" had 11 for 12 —
 * meaning a sazonal candidate with rankingScore as low as 14-17
 * (Presépio Sagrada Família, Kit Decoração Natalina) held a GUARANTEED
 * slot ahead of real recorrente candidates scoring 34 (Secador Philco,
 * Air Fryer Philco, Parafusadeira), because the two groups never had to
 * compete directly — only a group's own leftover unfilled slots ever
 * got backfilled from elsewhere.
 *
 * Fixed: every real, evidence-sufficient, audit-approved candidate
 * (regardless of group label) is ranked on the SAME real rankingScore —
 * unchanged formula, unchanged weights (owner's explicit rule: "não
 * altere pesos arbitrariamente para produzir resultados desejados") —
 * then a single, ONE-PASS diversity cap (the same generic, already-
 * tested applyCategoryConcentrationCap, unchanged, just no longer run
 * three times in three separate buckets) prevents redundant near-
 * identical products from crowding out everything else. `group` becomes
 * a purely descriptive label (why this candidate was found) attached to
 * the groupReport for visibility — it was never, and must never become
 * again, a reserved quota. If diversity capping would leave the
 * showcase under capacity, the capped-out candidates are still
 * backfilled (same as before) — diversity is a tiebreaker among
 * already-good candidates, never a reason to leave a real vaga empty,
 * and never a guaranteed floor for a weaker group either (owner's
 * explicit rule: "não crie pisos mínimos obrigatórios que reproduzam o
 * problema atual com outro nome").
 */
export function pickGlobalVitrineSelection(
  allScored: VitrineCandidate[],
  limit: number,
  activeEventNamesForReport: string,
): { picked: VitrineCandidate[]; groupReport: GroupFillReport[] } {
  const rankedGlobally = [...allScored].sort((a, b) => b.rankingScore - a.rankingScore);

  // Same reasoning as before (owner's finding, 2026-11-20, "Auditoria
  // Contínua", section 4): a keyword-discovered seasonal find often
  // carries no real ML categoryId, so falling back to the matched
  // keyword as the concentration key still catches near-duplicate
  // seasonal finds that compete for the exact same purchase intent.
  const MAX_PER_CATEGORY = 2;
  const concentrationKey = (c: VitrineCandidate) => c.categoryId ?? (c.matchedKeyword ? `kw:${c.matchedKeyword}` : null);
  const { picked } = applyCategoryConcentrationCap(rankedGlobally, limit, MAX_PER_CATEGORY, concentrationKey);

  const selectedByGroup = new Map<VitrineGroupType, number>();
  for (const c of picked) selectedByGroup.set(c.group, (selectedByGroup.get(c.group) ?? 0) + 1);
  const eligibleByGroup = new Map<VitrineGroupType, number>();
  for (const c of allScored) eligibleByGroup.set(c.group, (eligibleByGroup.get(c.group) ?? 0) + 1);

  const groupReport: GroupFillReport[] = ALL_GROUP_TYPES.map((group) => {
    const eligible = eligibleByGroup.get(group) ?? 0;
    const selected = selectedByGroup.get(group) ?? 0;
    return {
      group,
      eligible,
      selected,
      reason:
        eligible > 0
          ? null
          : group === "sazonal"
            ? `Nenhum candidato com relevância sazonal GENUÍNA (palavra-chave real para evento temático, ou queda de preço comprovada para evento promocional) agora (${activeEventNamesForReport}).`
            : group === "emergente"
              ? "Nenhum candidato com tendência de ranking real em alta ou achado pela varredura de palavras-chave em alta."
              : "Nenhum candidato recorrente elegível depois da deduplicação por família comercial.",
    };
  });

  return { picked: picked.slice(0, limit), groupReport };
}
