import { prisma } from "@/lib/db";
import type { MonetizationScoreComponents } from "@/types/monetization";

/**
 * Real-world facts about a single Mercado Livre or Shopee MerchantListing,
 * assembled from MerchantListingSignal/CanonicalProduct/AffiliateLinkRegistry
 * for the Acquisition Engine (publication-gate.ts, public-product.ts).
 *
 * The `raw` JSON parsing here deliberately MIRRORS the parsing already done
 * in lib/queries/radar-events.ts (collectShopeeEvents/collectMercadoLivreEvents)
 * and lib/queries/unified-offers.ts (getUnifiedMerchantOffers) rather than
 * extracting/refactoring those files — both are tested and used in
 * production today, and a "make it DRY" refactor there is a real regression
 * risk for a purely cosmetic gain. If either file's parsing logic changes,
 * revisit whether it's time to unify. See docs/RADAR.md / docs/MONETIZATION_SCORE.md.
 */

export type MerchantListingMerchant = "SHOPEE" | "MERCADO_LIVRE";
export type AffiliateLinkStatusFact = "PENDING" | "ACTIVE" | "INVALID" | "DISABLED";

export interface MerchantListingFacts {
  merchantListingId: string;
  merchant: MerchantListingMerchant;
  externalId: string;
  active: boolean;
  title: string;
  imageUrl: string | null;
  brand: string | null;
  model: string | null;
  currentPrice: number | null;
  priceHistory: Array<{ price: number; observedAt: Date }>;
  rating: number | null;
  reviewCount: number | null;
  soldQuantity: number | null;
  bestsellerRank: number | null;
  trendRank: number | null;
  /** From MonetizationScore.components.offerQuality.value — never
   * recalculated here (project brief: OpportunityScore/offer-quality math
   * lives in exactly one place, lib/services/ml-offer-quality.ts). */
  offerQualityScore: number | null;
  sellerReputationLevel: string | null;
  freeShipping: boolean | null;
  condition: string | null;
  lastObservedAt: Date | null;
  canonicalProductId: string | null;
  affiliateLinkStatus: AffiliateLinkStatusFact | null;
  affiliateUrl: string | null;
  affiliateLinkUpdatedAt: Date | null;
  productUrl: string;
  /** CanonicalProduct.categoryId when one exists (Mercado Livre only —
   * Shopee has no CanonicalProduct today) — used only for safe "related
   * opportunities" grouping, never for cross-merchant matching. */
  categoryId: string | null;
}

// ---------------------------------------------------------------------
// Pure parsing (no I/O) — takes already-fetched rows, never calls Prisma.
// ---------------------------------------------------------------------

interface ShopeeSignalRaw {
  productName?: string;
  imageUrl?: string;
  priceMin?: string;
  priceDiscountRate?: number;
  rating?: number;
  sales?: number;
}

export interface ShopeeFactsInput {
  listing: {
    id: string;
    externalId: string;
    active: boolean;
    productUrl: string;
    canonicalProductId: string | null;
  };
  signals: Array<{
    raw: unknown;
    rating: number | null;
    reviewCount: number | null;
    observedAt: Date;
  }>;
  monetizationScore: { components: unknown } | null;
  affiliateLink: { status: string; affiliateUrl: string | null; updatedAt: Date } | null;
}

/** Same raw.priceMin/productName/imageUrl/rating/sales reading as
 * lib/queries/unified-offers.ts's getUnifiedMerchantOffers (shopeeCards). */
export function extractShopeeListingFacts(input: ShopeeFactsInput): MerchantListingFacts {
  const sorted = [...input.signals].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime());
  const priceHistory = sorted
    .map((s) => {
      const raw = s.raw as ShopeeSignalRaw | null;
      const price = raw?.priceMin ? Number(raw.priceMin) : null;
      return price !== null && !Number.isNaN(price) ? { price, observedAt: s.observedAt } : null;
    })
    .filter((p): p is { price: number; observedAt: Date } => p !== null);

  const latest = sorted.length > 0 ? sorted[sorted.length - 1]! : null;
  const latestRaw = latest?.raw as ShopeeSignalRaw | null;
  const components = input.monetizationScore?.components as MonetizationScoreComponents | undefined;

  return {
    merchantListingId: input.listing.id,
    merchant: "SHOPEE",
    externalId: input.listing.externalId,
    active: input.listing.active,
    title: latestRaw?.productName ?? input.listing.externalId,
    imageUrl: latestRaw?.imageUrl ?? null,
    brand: null, // Shopee never exposes a structured brand/model today.
    model: null,
    currentPrice: priceHistory.length > 0 ? priceHistory[priceHistory.length - 1]!.price : null,
    priceHistory,
    rating: latest?.rating ?? latestRaw?.rating ?? null,
    reviewCount: latest?.reviewCount ?? null,
    soldQuantity: latestRaw?.sales ?? null,
    bestsellerRank: null,
    trendRank: null,
    offerQualityScore: components?.offerQuality?.value ?? null,
    sellerReputationLevel: null,
    freeShipping: null,
    condition: null,
    lastObservedAt: latest?.observedAt ?? null,
    canonicalProductId: input.listing.canonicalProductId,
    affiliateLinkStatus: (input.affiliateLink?.status as AffiliateLinkStatusFact | undefined) ?? null,
    affiliateUrl: input.affiliateLink?.affiliateUrl ?? null,
    affiliateLinkUpdatedAt: input.affiliateLink?.updatedAt ?? null,
    productUrl: input.listing.productUrl,
    categoryId: null,
  };
}

interface MlOfferRaw {
  price?: number;
  original_price?: number | null;
  discountPercent?: number | null;
  condition?: string;
  shipping?: { free_shipping?: boolean };
  seller?: { levelId?: string | null };
}

export interface MercadoLivreFactsInput {
  /** The catalog row itself — identified upstream as the MerchantListing
   * whose own signals never include source "mercado_livre_catalog_items"
   * (that source marks an individual seller offer, never the catalog row —
   * same rule as lib/queries/ml-affiliate-queue.ts). This is the row
   * AffiliateLinkRegistry is keyed to. */
  catalogListing: {
    id: string;
    externalId: string;
    active: boolean;
    productUrl: string;
    canonicalProductId: string | null;
  };
  canonicalProduct: {
    title: string;
    imageUrl: string | null;
    brand: string | null;
    model: string | null;
    categoryId: string | null;
  } | null;
  catalogSignals: Array<{ bestsellerRank: number | null; trendRank: number | null; observedAt: Date }>;
  /** The best-scoring sibling MerchantListing sharing the same
   * canonicalProductId (real seller offer) — same "best offer per
   * canonical product" rule as radar-events.ts/unified-offers.ts. Null
   * when enrichment hasn't found a real offer yet. */
  bestOffer: {
    signals: Array<{ raw: unknown; observedAt: Date }>;
    monetizationScore: { components: unknown } | null;
  } | null;
  affiliateLink: { status: string; affiliateUrl: string | null; updatedAt: Date } | null;
}

export function extractMercadoLivreListingFacts(input: MercadoLivreFactsInput): MerchantListingFacts {
  const sortedCatalogSignals = [...input.catalogSignals].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const latestCatalogSignal = sortedCatalogSignals.length > 0 ? sortedCatalogSignals[sortedCatalogSignals.length - 1]! : null;

  const offerSignalsSorted = input.bestOffer
    ? [...input.bestOffer.signals].sort((a, b) => a.observedAt.getTime() - b.observedAt.getTime())
    : [];
  const priceHistory = offerSignalsSorted
    .map((s) => {
      const raw = s.raw as MlOfferRaw | null;
      return raw?.price !== undefined ? { price: raw.price, observedAt: s.observedAt } : null;
    })
    .filter((p): p is { price: number; observedAt: Date } => p !== null);

  const latestOfferSignal = offerSignalsSorted.length > 0 ? offerSignalsSorted[offerSignalsSorted.length - 1]! : null;
  const latestOfferRaw = latestOfferSignal?.raw as MlOfferRaw | null;
  const components = input.bestOffer?.monetizationScore?.components as MonetizationScoreComponents | undefined;

  return {
    merchantListingId: input.catalogListing.id,
    merchant: "MERCADO_LIVRE",
    externalId: input.catalogListing.externalId,
    active: input.catalogListing.active,
    title: input.canonicalProduct?.title ?? input.catalogListing.externalId,
    imageUrl: input.canonicalProduct?.imageUrl ?? null,
    brand: input.canonicalProduct?.brand ?? null,
    model: input.canonicalProduct?.model ?? null,
    currentPrice: priceHistory.length > 0 ? priceHistory[priceHistory.length - 1]!.price : null,
    priceHistory,
    rating: null, // UNKNOWN for Mercado Livre — see docs/MONETIZATION_SCORE.md.
    reviewCount: null,
    soldQuantity: null,
    bestsellerRank: latestCatalogSignal?.bestsellerRank ?? null,
    trendRank: latestCatalogSignal?.trendRank ?? null,
    offerQualityScore: components?.offerQuality?.value ?? null,
    sellerReputationLevel: latestOfferRaw?.seller?.levelId ?? null,
    freeShipping: latestOfferRaw?.shipping?.free_shipping ?? null,
    condition: latestOfferRaw?.condition ?? null,
    lastObservedAt: latestOfferSignal?.observedAt ?? latestCatalogSignal?.observedAt ?? null,
    canonicalProductId: input.catalogListing.canonicalProductId,
    affiliateLinkStatus: (input.affiliateLink?.status as AffiliateLinkStatusFact | undefined) ?? null,
    affiliateUrl: input.affiliateLink?.affiliateUrl ?? null,
    affiliateLinkUpdatedAt: input.affiliateLink?.updatedAt ?? null,
    productUrl: input.catalogListing.productUrl,
    categoryId: input.canonicalProduct?.categoryId ?? null,
  };
}

// ---------------------------------------------------------------------
// Prisma loading layer — only these functions touch the database.
// ---------------------------------------------------------------------

async function findBestOfferSibling(canonicalProductId: string, excludeListingId: string) {
  return prisma.merchantListing.findFirst({
    where: { canonicalProductId, id: { not: excludeListingId } },
    include: { monetizationScore: true, signals: { orderBy: { observedAt: "asc" } } },
    orderBy: { monetizationScore: { score: "desc" } },
  });
}

/** Loads facts for a single MerchantListing by its own id, dispatching on
 * merchant code. For Mercado Livre, `listingId` must be the catalog row
 * (the row with a CanonicalProduct and no "mercado_livre_catalog_items"
 * signal) — passing an individual offer row's id returns null. */
export async function loadMerchantListingFactsByListingId(
  listingId: string,
): Promise<MerchantListingFacts | null> {
  const listing = await prisma.merchantListing.findUnique({
    where: { id: listingId },
    include: {
      merchant: true,
      affiliateLink: true,
      canonicalProduct: true,
      monetizationScore: true,
      signals: { orderBy: { observedAt: "asc" } },
    },
  });
  if (!listing) return null;

  if (listing.merchant.code === "SHOPEE") {
    return extractShopeeListingFacts({
      listing,
      signals: listing.signals,
      monetizationScore: listing.monetizationScore,
      affiliateLink: listing.affiliateLink,
    });
  }

  if (listing.merchant.code === "MERCADO_LIVRE") {
    const isOfferRow = listing.signals.some((s) => s.source === "mercado_livre_catalog_items");
    if (isOfferRow || !listing.canonicalProductId) return null;

    const bestOffer = await findBestOfferSibling(listing.canonicalProductId, listing.id);
    return extractMercadoLivreListingFacts({
      catalogListing: listing,
      canonicalProduct: listing.canonicalProduct,
      catalogSignals: listing.signals,
      bestOffer,
      affiliateLink: listing.affiliateLink,
    });
  }

  return null; // Amazon/AWIN/generic-affiliate are out of scope for this module.
}

/** Shopee only — MerchantListing.slug is the public identity for a merchant
 * with no CanonicalProduct. */
export async function loadMerchantListingFactsBySlug(
  slug: string,
): Promise<MerchantListingFacts | null> {
  const listing = await prisma.merchantListing.findUnique({
    where: { slug },
    include: {
      merchant: true,
      affiliateLink: true,
      monetizationScore: true,
      signals: { orderBy: { observedAt: "asc" } },
    },
  });
  if (!listing || listing.merchant.code !== "SHOPEE") return null;

  return extractShopeeListingFacts({
    listing,
    signals: listing.signals,
    monetizationScore: listing.monetizationScore,
    affiliateLink: listing.affiliateLink,
  });
}

/** Mercado Livre only — resolves via CanonicalProduct.publicSlug (or, as a
 * fallback for a product that hasn't been visited yet, the internal
 * `slug` ml-enrichment-collector.ts keys its upsert to) to the catalog row
 * and its best real offer sibling. */
export async function loadMerchantListingFactsByPublicSlug(
  publicSlugOrInternalSlug: string,
): Promise<{ facts: MerchantListingFacts; canonicalProductId: string; hasPublicSlug: boolean } | null> {
  const canonical = await prisma.canonicalProduct.findFirst({
    where: { OR: [{ publicSlug: publicSlugOrInternalSlug }, { slug: publicSlugOrInternalSlug }] },
    include: {
      listings: {
        include: {
          merchant: true,
          affiliateLink: true,
          monetizationScore: true,
          signals: { orderBy: { observedAt: "asc" } },
        },
      },
    },
  });
  if (!canonical) return null;

  const mlListings = canonical.listings.filter((l) => l.merchant.code === "MERCADO_LIVRE");
  const catalogListing = mlListings.find((l) => !l.signals.some((s) => s.source === "mercado_livre_catalog_items"));
  if (!catalogListing) return null;

  const bestOffer = await findBestOfferSibling(canonical.id, catalogListing.id);
  const facts = extractMercadoLivreListingFacts({
    catalogListing,
    canonicalProduct: canonical,
    catalogSignals: catalogListing.signals,
    bestOffer,
    affiliateLink: catalogListing.affiliateLink,
  });

  return { facts, canonicalProductId: canonical.id, hasPublicSlug: canonical.publicSlug !== null };
}
