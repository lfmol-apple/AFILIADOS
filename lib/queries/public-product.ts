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
    radarEvents: buildRadarEventsForFacts(facts),
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

/**
 * Every Mercado Livre/Shopee product page that has earned a spot in
 * app/sitemap.ts — a real slug already exists (this never generates one:
 * see ensurePublicSlugsForAllEligibleListings/scripts/backfill-public-
 * slugs.ts for that) AND evaluatePublicationGate().indexable is true.
 * At today's real volume (a few dozen listings) a per-listing Prisma
 * round-trip through loadMerchantListingFactsBy* is acceptable; revisit if
 * volume grows enough to matter (same scaling note as lib/queries/
 * radar-events.ts).
 */
export async function listIndexableMerchantProductUrls(): Promise<IndexableMerchantProductUrl[]> {
  const urls: IndexableMerchantProductUrl[] = [];

  const canonicalsWithPublicSlug = await prisma.canonicalProduct.findMany({
    where: { publicSlug: { not: null }, listings: { some: { merchant: { code: "MERCADO_LIVRE" } } } },
    select: { publicSlug: true },
  });
  for (const canonical of canonicalsWithPublicSlug) {
    const resolved = await loadMerchantListingFactsByPublicSlug(canonical.publicSlug!);
    if (!resolved) continue;
    const gate = evaluatePublicationGate(resolved.facts);
    if (gate.indexable && resolved.facts.lastObservedAt) {
      urls.push({ slug: canonical.publicSlug!, lastModified: resolved.facts.lastObservedAt });
    }
  }

  const shopeeListingsWithSlug = await prisma.merchantListing.findMany({
    where: { slug: { not: null }, active: true, merchant: { code: "SHOPEE" } },
    select: { id: true, slug: true },
  });
  for (const listing of shopeeListingsWithSlug) {
    const facts = await loadMerchantListingFactsByListingId(listing.id);
    if (!facts) continue;
    const gate = evaluatePublicationGate(facts);
    if (gate.indexable && facts.lastObservedAt) {
      urls.push({ slug: listing.slug!, lastModified: facts.lastObservedAt });
    }
  }

  return urls;
}
