import { prisma } from "@/lib/db";

/** Below this MonetizationScore, a Mercado Livre opportunity doesn't reach
 * the admin's attention yet — the whole point of the queue is a human
 * processing a handful of genuinely good items in a few minutes, not
 * triaging everything the demand engine has ever seen. Exported so a
 * caller/test can override it explicitly rather than guess the default. */
export const DEFAULT_MIN_MONETIZATION_SCORE = 50;

export interface MlAffiliateQueueItem {
  merchantListingId: string;
  title: string;
  /** The best real offer's item page when Phase 2 enrichment
   * (scripts/ml-enrich-offers.ts) found one — a real, navigable Mercado
   * Livre product page the operator can open to generate the affiliate
   * link. Falls back to the catalog listing's own (non-navigable)
   * productUrl when no enriched offer exists yet — never blank. */
  publicUrl: string;
  brand: string | null;
  monetizationScore: number | null;
  monetizationConfidence: number;
  monetizationReasons: string[];
  latestSignal: {
    soldQuantity: number | null;
    trendRank: number | null;
    bestsellerRank: number | null;
    commissionRate: number | null;
    estimatedCommissionAmount: string | null;
    observedAt: Date;
  } | null;
  /** Set only when Phase 2 commercial enrichment found a real seller offer
   * for this product (GET /products/{id}/items) — null means "not
   * enriched yet, showing demand-only data" (pre-existing behavior),
   * never a fabricated placeholder. */
  bestOffer: {
    price: number;
    originalPrice: number | null;
    discountPercent: number | null;
    condition: string | null;
    freeShipping: boolean | null;
    sellerNickname: string | null;
    sellerReputationLevel: string | null;
    sellerPowerSellerStatus: string | null;
  } | null;
}

/**
 * Mercado Livre listings that (a) don't have an ACTIVE affiliate link yet,
 * and (b) clear the economic bar — exactly what the /admin "links
 * pendentes" queue shows. Never includes a listing that already has a
 * working link (project brief: item leaves the queue the moment it's
 * saved) or one whose MonetizationScore is null/below threshold (no
 * evidence yet is not the same as "worth a human's time now").
 */
export async function getMlAffiliateQueue(
  minScore: number = DEFAULT_MIN_MONETIZATION_SCORE,
): Promise<MlAffiliateQueueItem[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: "MERCADO_LIVRE" },
      affiliateLink: {
        // No row at all, or a row that isn't ACTIVE — either way, a human
        // still needs to produce a working link.
        is: null,
      },
      monetizationScore: { score: { gte: minScore } },
      // A real seller offer (scripts/ml-enrich-offers.ts) must never be
      // its own separate queue row — it's surfaced only as the catalog
      // row's enriched bestOffer (enrichWithBestOffer below). Without
      // this, every one of possibly hundreds of real offers under one
      // product would flood the queue as if each were its own
      // opportunity (found 2026-09-07: 179 real offers, 0 catalog rows,
      // after the first live enrichment run).
      signals: { none: { source: "mercado_livre_catalog_items" } },
    },
    include: {
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
      canonicalProduct: { select: { title: true, brand: true, specifications: true } },
    },
    orderBy: { monetizationScore: { score: "desc" } },
  });

  // Also catch listings with an affiliateLink row that exists but isn't
  // ACTIVE (PENDING/INVALID/DISABLED) — Prisma's relation filter above
  // (`is: null`) only matches "no row"; a non-ACTIVE row needs a second,
  // explicit query since "is" can't express "exists but status != ACTIVE"
  // without a raw filter on the related record.
  const withInactiveLink = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: "MERCADO_LIVRE" },
      affiliateLink: { isNot: null, is: { status: { not: "ACTIVE" } } },
      monetizationScore: { score: { gte: minScore } },
      signals: { none: { source: "mercado_livre_catalog_items" } },
    },
    include: {
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
      canonicalProduct: { select: { title: true, brand: true, specifications: true } },
    },
    orderBy: { monetizationScore: { score: "desc" } },
  });

  const all = [...listings, ...withInactiveLink];

  const items = await Promise.all(all.map((listing) => enrichWithBestOffer(listing)));

  // Re-sort here (not just via the SQL orderBy above): a listing whose
  // displayed monetizationScore got upgraded to its best real offer's
  // richer score (demand + real offerQuality, vs. the catalog row's
  // demand-only score) must sort by that same upgraded number — "ordene
  // pelos melhores sinais comerciais reais disponíveis" (project brief).
  return items.sort((a, b) => (b.monetizationScore ?? -1) - (a.monetizationScore ?? -1));
}

type CandidateListing = Awaited<
  ReturnType<typeof prisma.merchantListing.findMany<{
    include: {
      monetizationScore: true;
      signals: { orderBy: { observedAt: "desc" }; take: 1 };
      canonicalProduct: { select: { title: true; brand: true; specifications: true } };
    };
  }>>
>[number];

/**
 * Phase 2: if scripts/ml-enrich-offers.ts already found real seller offers
 * for this catalog product (a MerchantListing sharing the same
 * canonicalProductId, but NOT the catalog row itself — identified via
 * CanonicalProduct.specifications.catalogProductId, set only by the
 * enrichment script), surface the highest-MonetizationScore one. Otherwise
 * falls back to the pre-existing demand-only display, unchanged.
 */
async function enrichWithBestOffer(listing: CandidateListing): Promise<MlAffiliateQueueItem> {
  const signal = listing.signals[0];
  const base: MlAffiliateQueueItem = {
    merchantListingId: listing.id,
    title: listing.canonicalProduct?.title ?? listing.externalId,
    publicUrl: listing.productUrl,
    brand: listing.canonicalProduct?.brand ?? null,
    monetizationScore: listing.monetizationScore?.score ?? null,
    monetizationConfidence: listing.monetizationScore?.confidence ?? 0,
    monetizationReasons: (listing.monetizationScore?.reasons as string[] | null) ?? [],
    latestSignal: signal
      ? {
          soldQuantity: signal.soldQuantity,
          trendRank: signal.trendRank,
          bestsellerRank: signal.bestsellerRank,
          commissionRate: signal.commissionRate,
          estimatedCommissionAmount: signal.estimatedCommissionAmount?.toString() ?? null,
          observedAt: signal.observedAt,
        }
      : null,
    bestOffer: null,
  };

  if (!listing.canonicalProductId) return base;
  const specs = listing.canonicalProduct as unknown as {
    specifications?: { catalogProductId?: string } | null;
  } | null;
  // Only the catalog row itself carries this exact field (set by
  // scripts/ml-enrich-offers.ts) — guards against treating an offer as
  // its own sibling.
  if (specs?.specifications?.catalogProductId !== listing.externalId) return base;

  const offers = await prisma.merchantListing.findMany({
    where: { canonicalProductId: listing.canonicalProductId, id: { not: listing.id } },
    include: {
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
    },
    orderBy: { monetizationScore: { score: "desc" } },
    take: 1,
  });
  const best = offers[0];
  if (!best?.monetizationScore) return base;

  const raw = best.signals[0]?.raw as
    | {
        price?: number;
        original_price?: number | null;
        discountPercent?: number | null;
        condition?: string;
        shipping?: { free_shipping?: boolean };
        seller?: {
          nickname?: string | null;
          levelId?: string | null;
          powerSellerStatus?: string | null;
        } | null;
      }
    | null;

  return {
    ...base,
    publicUrl: best.productUrl,
    monetizationScore: best.monetizationScore.score,
    monetizationConfidence: best.monetizationScore.confidence ?? 0,
    monetizationReasons: (best.monetizationScore.reasons as string[] | null) ?? [],
    bestOffer: raw?.price
      ? {
          price: raw.price,
          originalPrice: raw.original_price ?? null,
          discountPercent: raw.discountPercent ?? null,
          condition: raw.condition ?? null,
          freeShipping: raw.shipping?.free_shipping ?? null,
          sellerNickname: raw.seller?.nickname ?? null,
          sellerReputationLevel: raw.seller?.levelId ?? null,
          sellerPowerSellerStatus: raw.seller?.powerSellerStatus ?? null,
        }
      : null,
  };
}
