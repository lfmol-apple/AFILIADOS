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
    },
    include: {
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
      canonicalProduct: { select: { title: true, brand: true } },
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
    },
    include: {
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
      canonicalProduct: { select: { title: true, brand: true } },
    },
    orderBy: { monetizationScore: { score: "desc" } },
  });

  const all = [...listings, ...withInactiveLink];

  return all.map((listing) => {
    const signal = listing.signals[0];
    return {
      merchantListingId: listing.id,
      title: listing.canonicalProduct?.title ?? listing.externalId,
      publicUrl: listing.productUrl,
      brand: listing.canonicalProduct?.brand ?? null,
      monetizationScore: listing.monetizationScore?.score ?? null,
      monetizationConfidence: listing.monetizationScore?.confidence ?? 0,
      monetizationReasons:
        (listing.monetizationScore?.reasons as string[] | null) ?? [],
      latestSignal: signal
        ? {
            soldQuantity: signal.soldQuantity,
            trendRank: signal.trendRank,
            bestsellerRank: signal.bestsellerRank,
            commissionRate: signal.commissionRate,
            estimatedCommissionAmount:
              signal.estimatedCommissionAmount?.toString() ?? null,
            observedAt: signal.observedAt,
          }
        : null,
    };
  });
}
