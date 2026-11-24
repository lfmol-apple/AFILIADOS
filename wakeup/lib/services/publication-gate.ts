import {
  detectHighQualityOffer,
  detectPriceDrop,
  detectRankEvent,
} from "@/lib/services/radar";
import type { MerchantListingFacts } from "@/lib/services/merchant-listing-facts";

/**
 * Deterministic editorial/SEO policy deciding whether a Mercado Livre or
 * Shopee MerchantListing has earned an indexable public page — NOT a
 * commercial score. Distinct from lib/services/publication-decision.ts
 * (GeneratedContent/DemandEngine's decidePublication, an unrelated
 * subsystem for /melhores and /comparar with incompatible inputs) and from
 * lib/services/monetization-score.ts (an internal "is this worth our
 * traffic" score that must never influence what the public sees/indexes —
 * project brief rule, also enforced by lib/queries/unified-offers.ts's
 * nonCommissionSignal()). This gate never reads MonetizationScore.
 *
 * Pure function over already-assembled facts — no Prisma, mirrors the
 * style of lib/services/radar.ts so it stays trivially unit-testable.
 */

/** A page older than this is stale enough that it shouldn't stay
 * indexed — documented, not hidden, like every other Radar threshold. */
export const MAX_OBSERVATION_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface PublicationGateResult {
  indexable: boolean;
  /** Populated when indexable=true — which real evidence justified it. */
  reasons: string[];
  /** Populated when indexable=false — what's missing. Commercial reasons
   * (see `commercial` below) and the SEO-only "no value-add" reason are
   * merged here for backward compatibility with existing callers. */
  missing: string[];
  /** Whether the commercial CTA (Ver oferta) may render — independent of
   * `indexable`: a page can exist and be visible without being indexed,
   * but a CTA never renders without an ACTIVE affiliate link. */
  ctaEligible: boolean;
  /** The commercial-essentials layer alone (active/price/link/recency),
   * same `evaluateCommercialEligibility` any other publication destination
   * (e.g. the Meta catalog feed) must call — kept separate so a caller can
   * tell "not commercially eligible" apart from "commercially fine, just
   * has no SEO value-add yet" (`seoValueAdd.present === false`). Never
   * confuse the two: only `commercial.eligible` is a real ineligibility
   * signal; `seoValueAdd` is an editorial/SEO-only concern. */
  commercial: CommercialEligibilityResult;
  /** The SEO-only "has this earned editorial attention" layer — never a
   * commercial-eligibility signal. A product can be commercially eligible
   * (real price, real active link) and still have `present: false` here,
   * simply because no price-drop/demand/quality/identity event fired yet. */
  seoValueAdd: { present: boolean; reasons: string[] };
}

/** The inputs every publication destination needs for the commercial
 * essentials — deliberately generic on the affiliate link so each
 * destination can supply its OWN correct link source (the public product
 * page uses AffiliateLinkRegistry via MerchantListingFacts.affiliateLinkStatus;
 * the Vitrine/Meta catalog feed uses the separate, Vitrine-specific
 * VitrineLink table) without duplicating the active/price/recency checks
 * that must mean the exact same thing everywhere. */
export interface CommercialEssentialsInput {
  active: boolean;
  title: string | null;
  externalId: string;
  currentPrice: number | null;
  lastObservedAt: Date | null;
  linkStatus: string | null;
  linkUrl: string | null;
}

export interface CommercialEligibilityResult {
  eligible: boolean;
  missing: string[];
}

/**
 * The single, shared commercial-eligibility criterion for publication —
 * used by evaluatePublicationGate() below (public product page, via
 * AffiliateLinkRegistry) AND by app/catalogo/mercado-livre.xml/route.ts
 * (Meta catalog feed, via VitrineLink). Never duplicate these checks at a
 * new call site — import this function instead, so both destinations keep
 * meaning the same thing by "commercially eligible" even though they
 * legitimately read the affiliate link from two different, intentionally
 * separate tables.
 */
export function evaluateCommercialEligibility(input: CommercialEssentialsInput): CommercialEligibilityResult {
  const missing: string[] = [];

  if (!input.active) missing.push("Listing inativo");
  if (!input.title || input.title === input.externalId) missing.push("Sem título real (apenas o ID técnico)");
  if (input.currentPrice === null || input.currentPrice <= 0) missing.push("Sem preço atual real e válido");

  const hasActiveLink = input.linkStatus === "ACTIVE" && Boolean(input.linkUrl);
  if (!hasActiveLink) missing.push("Link de afiliado não está ACTIVE (sem link comercial real)");

  const isRecentEnough =
    input.lastObservedAt !== null && Date.now() - input.lastObservedAt.getTime() <= MAX_OBSERVATION_AGE_MS;
  if (!isRecentEnough) missing.push("Nenhuma observação real recente (última observação ausente ou obsoleta)");

  return { eligible: missing.length === 0, missing };
}

export function evaluatePublicationGate(facts: MerchantListingFacts): PublicationGateResult {
  const commercial = evaluateCommercialEligibility({
    active: facts.active,
    title: facts.title,
    externalId: facts.externalId,
    currentPrice: facts.currentPrice,
    lastObservedAt: facts.lastObservedAt,
    linkStatus: facts.affiliateLinkStatus,
    linkUrl: facts.affiliateUrl,
  });
  // Kept as its own literal check (not just "commercial.eligible") because
  // ctaEligible must stay true/false independent of recency/active/price —
  // a stale or inactive listing still shouldn't render a broken CTA, but
  // that's already covered by missing.length>0 blocking `indexable`; this
  // mirrors the exact pre-existing ctaEligible semantics so no caller sees
  // a behavior change.
  const ctaEligible = facts.affiliateLinkStatus === "ACTIVE" && Boolean(facts.affiliateUrl);

  const missing: string[] = [...commercial.missing];
  const reasons: string[] = [];

  const priceDropEvent = detectPriceDrop(facts.merchantListingId, facts.priceHistory);
  if (priceDropEvent) reasons.push(`Queda de preço real: ${priceDropEvent.headline}`);
  else if (facts.priceHistory.length >= 2) reasons.push("Histórico real com 2 ou mais observações de preço");

  const rankEvent = detectRankEvent(facts.merchantListingId, {
    bestsellerRank: facts.bestsellerRank,
    trendRank: facts.trendRank,
    observedAt: facts.lastObservedAt ?? new Date(0),
  });
  if (rankEvent) reasons.push(`Demanda real: ${rankEvent.headline}`);

  const qualityEvent = detectHighQualityOffer(facts.merchantListingId, {
    offerQualityScore: facts.offerQualityScore ?? undefined,
    rating: facts.rating,
    sellerReputationLevel: facts.sellerReputationLevel,
    freeShipping: facts.freeShipping,
    condition: facts.condition,
    observedAt: facts.lastObservedAt ?? new Date(0),
  });
  if (qualityEvent) reasons.push(`Qualidade real: ${qualityEvent.headline}`);

  const hasSafeIdentity =
    facts.canonicalProductId !== null || (facts.brand !== null && facts.model !== null);
  if (hasSafeIdentity) reasons.push("Identidade real (marca/modelo ou CanonicalProduct seguro)");

  const seoHasValueAdd = reasons.length > 0;
  if (!seoHasValueAdd) {
    missing.push("Nenhum valor adicional real: sem histórico, sem demanda, sem qualidade, sem identidade");
  }

  // Indexability still requires BOTH layers (commercial essentials AND SEO
  // value-add) — unchanged from before. What's new is that callers can now
  // tell the two apart via `commercial`/`seoValueAdd` instead of only
  // seeing them pre-merged into one undifferentiated `missing` list.
  const indexable = commercial.eligible && seoHasValueAdd;

  return {
    indexable,
    reasons: indexable ? reasons : [],
    missing: indexable ? [] : missing,
    ctaEligible,
    commercial,
    seoValueAdd: { present: seoHasValueAdd, reasons },
  };
}
