import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/config/site";
import { generateUniqueSlug } from "@/lib/services/slug";
import {
  detectHighQualityOffer,
  detectPriceDrop,
  detectRankEvent,
  type RadarEvent,
} from "@/lib/services/radar";
import { evaluatePublicationGate, type PublicationGateResult } from "@/lib/services/publication-gate";
import {
  extractMercadoLivreListingFacts,
  extractShopeeListingFacts,
  loadMerchantListingFactsByListingId,
  loadMerchantListingFactsByPublicSlug,
  loadMerchantListingFactsBySlug,
  type MerchantListingFacts,
  type MerchantListingMerchant,
} from "@/lib/services/merchant-listing-facts";

/**
 * Multi-merchant loader for /produto/[slug] — Amazon keeps using
 * lib/queries/products.ts's getProductBySlug() completely unchanged
 * (called directly from app/produto/[slug]/page.tsx before this module is
 * ever touched). This file only resolves Mercado Livre/Shopee, the new
 * Acquisition Engine surface. No `/produto-ml`, no `/produto-shopee` — the
 * merchant never shapes the URL, only which loader answers it.
 */

// Mirrors lib/queries/radar-events.ts's MERCHANT_TO_CTA_SEGMENT — kept as a
// small, separate copy rather than exporting from that (tested, production)
// file just for this.
const MERCHANT_TO_CTA_SEGMENT: Record<MerchantListingMerchant, string> = {
  SHOPEE: "shopee",
  MERCADO_LIVRE: "mercado-livre",
};

export interface PublicMerchantProductViewModel {
  source: MerchantListingMerchant;
  merchantListingId: string;
  externalId: string;
  canonicalProductId: string | null;
  categoryId: string | null;
  slug: string;
  canonicalUrl: string;
  title: string;
  brand: string | null;
  model: string | null;
  imageUrl: string | null;
  currentPrice: number | null;
  currency: "BRL";
  priceHistory: Array<{ price: number; observedAt: Date }>;
  rating: number | null;
  reviewCount: number | null;
  lastObservedAt: Date | null;
  ctaHref: string | null;
  gate: PublicationGateResult;
  radarEvents: RadarEvent[];
  /** One real, evidence-only sentence answering "por que está aqui?" —
   * project brief section 9. Built from the single strongest real
   * RadarEvent (never a fabricated summary); a neutral honest line when
   * there isn't one yet. */
  decisionSummary: string;
}

/** Mirrors radar.ts's EVENT_TYPE_BASE_WEIGHT ordering (PRICE_DROP >
 * HIGH_QUALITY_OFFER > BESTSELLER_ENTRY > TREND_ENTRY) — not imported
 * because that map is private to radar.ts and only its relative order
 * matters here, not its exact weights. */
const DECISION_SUMMARY_PRIORITY: Record<RadarEvent["type"], number> = {
  PRICE_DROP: 4,
  HIGH_QUALITY_OFFER: 3,
  BESTSELLER_ENTRY: 2,
  TREND_ENTRY: 1,
  AFFILIATE_LINK_ACTIVATED: 0,
};

export function buildDecisionSummary(events: RadarEvent[]): string {
  if (events.length === 0) {
    return "Ainda estamos reunindo sinais suficientes sobre este produto.";
  }
  const [top] = [...events].sort(
    (a, b) => DECISION_SUMMARY_PRIORITY[b.type] - DECISION_SUMMARY_PRIORITY[a.type],
  );
  switch (top!.type) {
    case "PRICE_DROP": {
      const dropPercent = top!.evidence.dropPercent;
      const percentText = dropPercent ? `${Math.round(dropPercent * 100)}%` : "";
      return `Vale atenção agora porque o preço caiu ${percentText} desde a observação anterior.`;
    }
    case "HIGH_QUALITY_OFFER":
      return "Vale atenção agora porque combina boa avaliação e uma oferta forte.";
    case "BESTSELLER_ENTRY":
      return "Vale atenção agora porque está entre os produtos mais vendidos que observamos.";
    case "TREND_ENTRY":
      return "Vale atenção agora porque está entre os produtos com maior alta de interesse que observamos.";
    default:
      return "Estamos acompanhando este produto.";
  }
}

function buildCtaHref(merchant: MerchantListingMerchant, externalId: string, ctaEligible: boolean, slug: string): string | null {
  if (!ctaEligible) return null;
  const params = new URLSearchParams({ pageType: "product", pageSlug: slug, source: "product_page" }).toString();
  return `/go/${MERCHANT_TO_CTA_SEGMENT[merchant]}/${encodeURIComponent(externalId)}?${params}`;
}

/** Real observations only — same detectors Radar uses everywhere else, run
 * against this one listing's own facts. Never a new "urgency" heuristic.
 * AFFILIATE_LINK_ACTIVATED is deliberately never computed here — it's an
 * internal/business fact (project brief section 5.D), excluded from every
 * public surface, same rule lib/queries/radar-events.ts's PUBLIC_EVENT_TYPES
 * already enforces for the Radar feed. */
function buildRadarEventsForFacts(facts: MerchantListingFacts): RadarEvent[] {
  const events: RadarEvent[] = [];
  const observedAt = facts.lastObservedAt ?? new Date(0);

  const priceDrop = detectPriceDrop(facts.merchantListingId, facts.priceHistory);
  if (priceDrop) events.push(priceDrop);

  const rank = detectRankEvent(facts.merchantListingId, {
    bestsellerRank: facts.bestsellerRank,
    trendRank: facts.trendRank,
    observedAt,
  });
  if (rank) events.push(rank);

  const quality = detectHighQualityOffer(facts.merchantListingId, {
    offerQualityScore: facts.offerQualityScore ?? undefined,
    rating: facts.rating,
    sellerReputationLevel: facts.sellerReputationLevel,
    freeShipping: facts.freeShipping,
    condition: facts.condition,
    observedAt,
  });
  if (quality) events.push(quality);

  return events;
}

function buildViewModel(facts: MerchantListingFacts, slug: string): PublicMerchantProductViewModel {
  const gate = evaluatePublicationGate(facts);
  const radarEvents = buildRadarEventsForFacts(facts);
  return {
    source: facts.merchant,
    merchantListingId: facts.merchantListingId,
    externalId: facts.externalId,
    canonicalProductId: facts.canonicalProductId,
    categoryId: facts.categoryId,
    slug,
    canonicalUrl: `${siteConfig.url}/produto/${slug}`,
    title: facts.title,
    brand: facts.brand,
    model: facts.model,
    imageUrl: facts.imageUrl,
    currentPrice: facts.currentPrice,
    currency: "BRL",
    priceHistory: facts.priceHistory,
    rating: facts.rating,
    reviewCount: facts.reviewCount,
    lastObservedAt: facts.lastObservedAt,
    ctaHref: buildCtaHref(facts.merchant, facts.externalId, gate.ctaEligible, slug),
    gate,
    radarEvents,
    decisionSummary: buildDecisionSummary(radarEvents),
  };
}

/** Idempotent: returns the existing publicSlug immediately, or generates
 * and persists one from the real title on first call. Never called by
 * jobs/ml-enrichment.ts or any cron job — only from this module (the page
 * loader, the optional backfill script, or getRelatedMerchantProducts). */
export async function ensureCanonicalProductPublicSlug(canonicalProductId: string, title: string): Promise<string> {
  const current = await prisma.canonicalProduct.findUnique({
    where: { id: canonicalProductId },
    select: { publicSlug: true },
  });
  if (current?.publicSlug) return current.publicSlug;

  const slug = await generateUniqueSlug(title, canonicalProductId, async (candidate) => {
    const existing = await prisma.canonicalProduct.findUnique({
      where: { publicSlug: candidate },
      select: { id: true },
    });
    return existing !== null;
  });

  try {
    const updated = await prisma.canonicalProduct.update({
      where: { id: canonicalProductId },
      data: { publicSlug: slug },
      select: { publicSlug: true },
    });
    return updated.publicSlug!;
  } catch {
    // Unique constraint race with a concurrent request — the other request
    // won, use whatever it persisted rather than erroring the page.
    const refetched = await prisma.canonicalProduct.findUnique({
      where: { id: canonicalProductId },
      select: { publicSlug: true },
    });
    if (refetched?.publicSlug) return refetched.publicSlug;
    throw new Error(`Failed to generate/persist publicSlug for CanonicalProduct ${canonicalProductId}`);
  }
}

/** Same idempotent lazy generation as ensureCanonicalProductPublicSlug,
 * for Shopee's MerchantListing.slug (no CanonicalProduct exists for
 * Shopee today). Never called by jobs/shopee-refresh.ts. */
export async function ensureShopeeListingSlug(listingId: string, title: string): Promise<string> {
  const current = await prisma.merchantListing.findUnique({ where: { id: listingId }, select: { slug: true } });
  if (current?.slug) return current.slug;

  const slug = await generateUniqueSlug(title, listingId, async (candidate) => {
    const existing = await prisma.merchantListing.findUnique({ where: { slug: candidate }, select: { id: true } });
    return existing !== null;
  });

  try {
    const updated = await prisma.merchantListing.update({
      where: { id: listingId },
      data: { slug },
      select: { slug: true },
    });
    return updated.slug!;
  } catch {
    const refetched = await prisma.merchantListing.findUnique({ where: { id: listingId }, select: { slug: true } });
    if (refetched?.slug) return refetched.slug;
    throw new Error(`Failed to generate/persist slug for MerchantListing ${listingId}`);
  }
}

/**
 * Resolves a /produto/[slug] request to a Mercado Livre or Shopee public
 * product, or null when neither matches (caller tries Amazon's own
 * getProductBySlug() first — this function is never called for an Amazon
 * hit). ML also accepts the internal ml-catalog-<id> slug as a bootstrap
 * fallback and lazily generates the pretty publicSlug on first resolution;
 * the view model's canonicalUrl always points at the pretty slug once it
 * exists, even when the request came in on the technical one.
 */
export async function loadPublicMerchantProduct(slug: string): Promise<PublicMerchantProductViewModel | null> {
  const mlResult = await loadMerchantListingFactsByPublicSlug(slug);
  if (mlResult) {
    const effectiveSlug = mlResult.hasPublicSlug
      ? slug
      : await ensureCanonicalProductPublicSlug(mlResult.canonicalProductId, mlResult.facts.title);
    return buildViewModel(mlResult.facts, effectiveSlug);
  }

  const shopeeFacts = await loadMerchantListingFactsBySlug(slug);
  if (shopeeFacts) return buildViewModel(shopeeFacts, slug);

  return null;
}

export interface RelatedMerchantProduct {
  slug: string;
  title: string;
  imageUrl: string | null;
}

/**
 * Up to `limit` other real, indexable opportunities from the SAME merchant
 * (never cross-merchant — ProductMatcher stays shadow-mode, 0 confirmed
 * matches, so nothing here may imply "same product elsewhere"), ordered by
 * recency, never by MonetizationScore (commission must never shape what a
 * consumer is shown — project brief rule, enforced project-wide).
 */
export async function getRelatedMerchantProducts(input: {
  merchant: MerchantListingMerchant;
  excludeListingId: string;
  categoryId?: string | null;
  limit?: number;
}): Promise<RelatedMerchantProduct[]> {
  const limit = input.limit ?? 4;
  const results: RelatedMerchantProduct[] = [];

  if (input.merchant === "MERCADO_LIVRE") {
    if (!input.categoryId) return [];
    const candidates = await prisma.canonicalProduct.findMany({
      where: {
        categoryId: input.categoryId,
        publicSlug: { not: null },
        listings: { some: { merchant: { code: "MERCADO_LIVRE" }, id: { not: input.excludeListingId }, active: true } },
      },
      select: { id: true, publicSlug: true, title: true, imageUrl: true },
      orderBy: { updatedAt: "desc" },
      take: limit * 3, // headroom — some candidates may fail the gate.
    });
    for (const candidate of candidates) {
      if (results.length >= limit) break;
      const resolved = await loadMerchantListingFactsByPublicSlug(candidate.publicSlug!);
      if (!resolved || !evaluatePublicationGate(resolved.facts).indexable) continue;
      results.push({ slug: candidate.publicSlug!, title: candidate.title, imageUrl: candidate.imageUrl });
    }
    return results;
  }

  const shopeeListings = await prisma.merchantListing.findMany({
    where: { merchant: { code: "SHOPEE" }, id: { not: input.excludeListingId }, active: true, slug: { not: null } },
    select: { id: true, slug: true },
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
  });
  for (const listing of shopeeListings) {
    if (results.length >= limit) break;
    const facts = await loadMerchantListingFactsByListingId(listing.id);
    if (!facts || !evaluatePublicationGate(facts).indexable) continue;
    results.push({ slug: listing.slug!, title: facts.title, imageUrl: facts.imageUrl });
  }
  return results;
}

export interface BackfillPublicSlugsSummary {
  canonicalProductsProcessed: number;
  canonicalProductsSlugGenerated: number;
  shopeeListingsProcessed: number;
  shopeeListingsSlugGenerated: number;
}

/**
 * Lazy generation (loadPublicMerchantProduct/getRelatedMerchantProducts)
 * only creates a slug once someone/something resolves that specific
 * listing. This proactively "warms" every currently eligible listing so
 * the sitemap (Fase 9) doesn't have to wait for organic traffic that can't
 * arrive without a URL to begin with. Read+write, but simple, idempotent
 * and never touches the scanner/cron jobs — safe to run manually anytime
 * via scripts/backfill-public-slugs.ts.
 */
export async function ensurePublicSlugsForAllEligibleListings(): Promise<BackfillPublicSlugsSummary> {
  const summary: BackfillPublicSlugsSummary = {
    canonicalProductsProcessed: 0,
    canonicalProductsSlugGenerated: 0,
    shopeeListingsProcessed: 0,
    shopeeListingsSlugGenerated: 0,
  };

  const mlCanonicals = await prisma.canonicalProduct.findMany({
    where: { publicSlug: null, listings: { some: { merchant: { code: "MERCADO_LIVRE" } } } },
    select: { id: true, title: true },
  });
  for (const canonical of mlCanonicals) {
    summary.canonicalProductsProcessed += 1;
    await ensureCanonicalProductPublicSlug(canonical.id, canonical.title);
    summary.canonicalProductsSlugGenerated += 1;
  }

  const shopeeListings = await prisma.merchantListing.findMany({
    where: { slug: null, active: true, merchant: { code: "SHOPEE" } },
    select: { id: true },
  });
  for (const listing of shopeeListings) {
    summary.shopeeListingsProcessed += 1;
    const facts = await loadMerchantListingFactsByListingId(listing.id);
    if (!facts) continue;
    await ensureShopeeListingSlug(listing.id, facts.title);
    summary.shopeeListingsSlugGenerated += 1;
  }

  return summary;
}

export interface IndexableMerchantProductUrl {
  slug: string;
  lastModified: Date;
}

/** Mirrors the identical helper in lib/queries/radar-events.ts and
 * lib/queries/unified-offers.ts (kept as three small local copies rather
 * than one shared import — see this project's precedent in
 * lib/services/merchant-listing-facts.ts's own doc comment about mirroring
 * vs. refactoring existing tested logic). */
const RECENT_SIGNALS_WINDOW = 10;

/**
 * Every Mercado Livre/Shopee product page that has earned a spot in
 * app/sitemap.ts — a real slug already exists (this never generates one:
 * see ensurePublicSlugsForAllEligibleListings/scripts/backfill-public-
 * slugs.ts for that) AND evaluatePublicationGate().indexable is true.
 *
 * Performance hotfix (2026-09-12): this used to do one Prisma round-trip
 * PER canonical product / Shopee listing via loadMerchantListingFactsBy*
 * (each of which does its own extra query) — fine at "a few dozen
 * listings", explosive at production's real ~800+ slugged rows and
 * growing. Now a fixed, small number of batched queries regardless of how
 * many rows exist: fetch every candidate row up front, group in memory,
 * and reuse the exact same pure extractMercadoLivreListingFacts/
 * extractShopeeListingFacts functions the per-item loaders already use —
 * so the Publication Gate's answer can never disagree between this bulk
 * path and /produto/[slug]'s own single-item lookup.
 */
export async function listIndexableMerchantProductUrls(): Promise<IndexableMerchantProductUrl[]> {
  const urls: IndexableMerchantProductUrl[] = [];

  // --- Mercado Livre: 2 queries total, never one per canonical product ---
  const canonicals = await prisma.canonicalProduct.findMany({
    where: { publicSlug: { not: null }, listings: { some: { merchant: { code: "MERCADO_LIVRE" } } } },
    select: { id: true, publicSlug: true, title: true, imageUrl: true, brand: true, model: true, categoryId: true },
  });
  const canonicalIds = canonicals.map((c) => c.id);
  const mlListings = canonicalIds.length
    ? await prisma.merchantListing.findMany({
        where: { canonicalProductId: { in: canonicalIds }, merchant: { code: "MERCADO_LIVRE" } },
        include: {
          affiliateLink: true,
          monetizationScore: true,
          signals: { orderBy: { observedAt: "desc" }, take: RECENT_SIGNALS_WINDOW },
        },
      })
    : [];
  const mlListingsByCanonical = new Map<string, typeof mlListings>();
  for (const listing of mlListings) {
    if (!listing.canonicalProductId) continue;
    const group = mlListingsByCanonical.get(listing.canonicalProductId) ?? [];
    group.push(listing);
    mlListingsByCanonical.set(listing.canonicalProductId, group);
  }

  for (const canonical of canonicals) {
    const group = mlListingsByCanonical.get(canonical.id) ?? [];
    // Same rule as everywhere else: an offer row is one that's ever been
    // written an "mercado_livre_catalog_items" signal; the catalog row
    // never gets that source (see lib/queries/ml-affiliate-queue.ts).
    const catalogListing = group.find(
      (l) => !l.signals.some((s) => s.source === "mercado_livre_catalog_items"),
    );
    if (!catalogListing) continue;
    const bestOffer = group
      .filter((l) => l.id !== catalogListing.id)
      .sort((a, b) => (b.monetizationScore?.score ?? -1) - (a.monetizationScore?.score ?? -1))[0];

    const facts = extractMercadoLivreListingFacts({
      catalogListing,
      canonicalProduct: canonical,
      catalogSignals: catalogListing.signals,
      bestOffer: bestOffer ? { signals: bestOffer.signals, monetizationScore: bestOffer.monetizationScore } : null,
      affiliateLink: catalogListing.affiliateLink,
    });
    const gate = evaluatePublicationGate(facts);
    if (gate.indexable && facts.lastObservedAt && canonical.publicSlug) {
      urls.push({ slug: canonical.publicSlug, lastModified: facts.lastObservedAt });
    }
  }

  // --- Shopee: 1 query total, never one per listing ---
  const shopeeListings = await prisma.merchantListing.findMany({
    where: { slug: { not: null }, active: true, merchant: { code: "SHOPEE" } },
    include: {
      affiliateLink: true,
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: RECENT_SIGNALS_WINDOW },
    },
  });
  for (const listing of shopeeListings) {
    const facts = extractShopeeListingFacts({
      listing,
      signals: listing.signals,
      monetizationScore: listing.monetizationScore,
      affiliateLink: listing.affiliateLink,
    });
    const gate = evaluatePublicationGate(facts);
    if (gate.indexable && facts.lastObservedAt && listing.slug) {
      urls.push({ slug: listing.slug, lastModified: facts.lastObservedAt });
    }
  }

  return urls;
}
