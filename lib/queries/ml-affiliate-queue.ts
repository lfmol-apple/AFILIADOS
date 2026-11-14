import { prisma } from "@/lib/db";
import {
  calculateMarketDemandEvidenceBatch,
  type MarketDemandEvidence,
  type MarketDemandObservation,
} from "@/lib/services/market-demand-evidence";

/** Below this MonetizationScore, a Mercado Livre opportunity doesn't reach
 * the admin's attention yet — the whole point of the queue is a human
 * processing a handful of genuinely good items in a few minutes, not
 * triaging everything the demand engine has ever seen. Exported so a
 * caller/test can override it explicitly rather than guess the default. */
export const DEFAULT_MIN_MONETIZATION_SCORE = 50;

/** Page-level display cap for the admin queue — deliberately not applied
 * inside getMlAffiliateQueue itself (its contract stays "every listing
 * that clears the economic bar", unchanged for tests/other callers).
 * Nothing is discarded: the query is already sorted best-first, so
 * slicing to this many at the render layer only bounds how much renders
 * at once — a human working top-down processes the same items either
 * way. See docs/AFFILIATE_LINK_REGISTRY.md and the 2026-09-14 discussion
 * that concluded a display cap loses no opportunity, since order never
 * changes based on how many rows are shown. */
export const DEFAULT_QUEUE_DISPLAY_LIMIT = 20;

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
    /** ALWAYS false today — no Mercado Livre endpoint reachable with this
     * app's current permissions confirms a real public permalink for a
     * third-party item (investigated exhaustively 2026-09-07: GET
     * /items/{id}, multiget, unauthenticated, field-restricted, site
     * search, buy_box_winner, pickers[].permalink — all blocked or empty).
     * `publicUrl` is a best-effort, item_id-based reference on Mercado
     * Livre's own domain, NEVER a confirmed clickable link — the UI must
     * never claim otherwise while this stays false. */
    permalinkVerified: boolean;
  } | null;
  /** SHADOW only: factual Mercado Livre demand evidence derived from
   * mercado_livre_highlights. Never participates in eligibility, queue
   * ordering, link saving, or dismissal. Null means there is no safe
   * catalog/highlights relationship to hydrate. */
  marketDemandEvidence: MarketDemandEvidence | null;
}

export interface MlAffiliateQueueShadowMovement {
  item: MlAffiliateQueueItem;
  currentPosition: number;
  shadowPosition: number;
  delta: number;
}

export interface MlAffiliateQueueShadowComparison {
  currentTop50: MlAffiliateQueueShadowMovement[];
  shadowTop50: MlAffiliateQueueShadowMovement[];
  topPromotions: MlAffiliateQueueShadowMovement[];
  topDemotions: MlAffiliateQueueShadowMovement[];
  currentTop20Retained: number;
  enteredTop20: MlAffiliateQueueShadowMovement[];
  exitedTop20: MlAffiliateQueueShadowMovement[];
  currentTop20RepeatedEvidence: Record<string, number>;
  shadowTop20RepeatedEvidence: Record<string, number>;
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
    // `id: "asc"` is a deterministic tiebreaker — without it, Postgres has
    // no guaranteed order among rows with the same score, so a tie could
    // silently return in a different order (or, for the `take: 1` "best
    // sibling offer" query above, pick a different seller/price) on two
    // otherwise-identical queries. Confirmed cause of the admin queue
    // visibly reshuffling mid-session, 2026-09-14.
    orderBy: [{ monetizationScore: { score: "desc" } }, { id: "asc" }],
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
    // `id: "asc"` is a deterministic tiebreaker — without it, Postgres has
    // no guaranteed order among rows with the same score, so a tie could
    // silently return in a different order (or, for the `take: 1` "best
    // sibling offer" query above, pick a different seller/price) on two
    // otherwise-identical queries. Confirmed cause of the admin queue
    // visibly reshuffling mid-session, 2026-09-14.
    orderBy: [{ monetizationScore: { score: "desc" } }, { id: "asc" }],
  });

  const all = [...listings, ...withInactiveLink];
  const evidenceByProductKey = await loadMarketDemandEvidenceForQueue(all);

  const items = await Promise.all(
    all.map((listing) => enrichWithBestOffer(listing, evidenceByProductKey)),
  );

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
async function enrichWithBestOffer(
  listing: CandidateListing,
  evidenceByProductKey: Map<string, MarketDemandEvidence>,
): Promise<MlAffiliateQueueItem> {
  const signal = listing.signals[0];
  const productKey = listing.canonicalProductId ?? listing.id;
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
    marketDemandEvidence: evidenceByProductKey.get(productKey) ?? null,
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
    // `id: "asc"` is a deterministic tiebreaker — without it, Postgres has
    // no guaranteed order among rows with the same score, so a tie could
    // silently return in a different order (or, for the `take: 1` "best
    // sibling offer" query above, pick a different seller/price) on two
    // otherwise-identical queries. Confirmed cause of the admin queue
    // visibly reshuffling mid-session, 2026-09-14.
    orderBy: [{ monetizationScore: { score: "desc" } }, { id: "asc" }],
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
        permalinkVerified?: boolean;
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
          // Defaults to false (never true) when a signal predates this
          // field, per the same "never claim verified without evidence"
          // rule as everything else here.
          permalinkVerified: raw.permalinkVerified ?? false,
        }
      : null,
  };
}

export function sortMlAffiliateQueueShadow(
  items: MlAffiliateQueueItem[],
): MlAffiliateQueueItem[] {
  const currentPosition = new Map(items.map((item, index) => [item.merchantListingId, index]));
  return [...items].sort((a, b) => compareShadowQueueItems(a, b, currentPosition));
}

export function buildMlAffiliateQueueShadowComparison(
  items: MlAffiliateQueueItem[],
): MlAffiliateQueueShadowComparison {
  const shadowItems = sortMlAffiliateQueueShadow(items);
  const currentPosition = new Map(items.map((item, index) => [item.merchantListingId, index + 1]));
  const shadowPosition = new Map(shadowItems.map((item, index) => [item.merchantListingId, index + 1]));

  const movements = items.map((item) => {
    const current = currentPosition.get(item.merchantListingId)!;
    const shadow = shadowPosition.get(item.merchantListingId)!;
    return { item, currentPosition: current, shadowPosition: shadow, delta: current - shadow };
  });

  const byPromotion = [...movements].sort(
    (a, b) => b.delta - a.delta || a.shadowPosition - b.shadowPosition,
  );
  const byDemotion = [...movements].sort(
    (a, b) => a.delta - b.delta || a.shadowPosition - b.shadowPosition,
  );

  const currentTop20Ids = new Set(items.slice(0, 20).map((item) => item.merchantListingId));
  const shadowTop20Ids = new Set(shadowItems.slice(0, 20).map((item) => item.merchantListingId));

  return {
    currentTop50: items.slice(0, 50).map((item) => toMovement(item, currentPosition, shadowPosition)),
    shadowTop50: shadowItems.slice(0, 50).map((item) => toMovement(item, currentPosition, shadowPosition)),
    topPromotions: byPromotion.filter((movement) => movement.delta > 0).slice(0, 10),
    topDemotions: byDemotion.filter((movement) => movement.delta < 0).slice(0, 10),
    currentTop20Retained: [...currentTop20Ids].filter((id) => shadowTop20Ids.has(id)).length,
    enteredTop20: shadowItems
      .slice(0, 20)
      .filter((item) => !currentTop20Ids.has(item.merchantListingId))
      .map((item) => toMovement(item, currentPosition, shadowPosition)),
    exitedTop20: items
      .slice(0, 20)
      .filter((item) => !shadowTop20Ids.has(item.merchantListingId))
      .map((item) => toMovement(item, currentPosition, shadowPosition)),
    currentTop20RepeatedEvidence: repeatedEvidenceDistribution(items.slice(0, 20)),
    shadowTop20RepeatedEvidence: repeatedEvidenceDistribution(shadowItems.slice(0, 20)),
  };
}

async function loadMarketDemandEvidenceForQueue(
  listings: CandidateListing[],
): Promise<Map<string, MarketDemandEvidence>> {
  if (listings.length === 0) return new Map();

  const listingIds = listings.map((listing) => listing.id);
  const canonicalProductIds = listings
    .map((listing) => listing.canonicalProductId)
    .filter((id): id is string => id !== null);

  const signals = await prisma.merchantListingSignal.findMany({
    where: {
      source: "mercado_livre_highlights",
      bestsellerRank: { not: null },
      merchantListing: {
        merchant: { code: "MERCADO_LIVRE" },
        OR: [
          { id: { in: listingIds } },
          ...(canonicalProductIds.length > 0
            ? [{ canonicalProductId: { in: canonicalProductIds } }]
            : []),
        ],
      },
    },
    select: {
      bestsellerRank: true,
      observedAt: true,
      raw: true,
      merchantListing: {
        select: {
          id: true,
          externalId: true,
          canonicalProductId: true,
          canonicalProduct: { select: { title: true } },
        },
      },
    },
    orderBy: { observedAt: "asc" },
  });

  const observations: MarketDemandObservation[] = signals.map((signal) => {
    const listing = signal.merchantListing;
    const raw = signal.raw as { categoryId?: string } | null;
    return {
      productKey: listing.canonicalProductId ?? listing.id,
      title: listing.canonicalProduct?.title ?? listing.externalId,
      bestsellerRank: signal.bestsellerRank,
      observedAt: signal.observedAt,
      categoryId: raw?.categoryId ?? null,
    };
  });

  return new Map(
    calculateMarketDemandEvidenceBatch(observations).map((evidence) => [
      evidence.productKey,
      evidence,
    ]),
  );
}

function compareShadowQueueItems(
  a: MlAffiliateQueueItem,
  b: MlAffiliateQueueItem,
  currentPosition: Map<string, number>,
): number {
  const aEvidence = a.marketDemandEvidence;
  const bEvidence = b.marketDemandEvidence;
  return (
    evidenceRank(bEvidence?.repeatedEvidence) - evidenceRank(aEvidence?.repeatedEvidence) ||
    confidenceRank(bEvidence?.confidence) - confidenceRank(aEvidence?.confidence) ||
    (bEvidence?.top10Observations ?? 0) - (aEvidence?.top10Observations ?? 0) ||
    (bEvidence?.totalBestsellerObservations ?? 0) - (aEvidence?.totalBestsellerObservations ?? 0) ||
    (aEvidence?.latestObservedBestsellerRank ?? Number.MAX_SAFE_INTEGER) -
      (bEvidence?.latestObservedBestsellerRank ?? Number.MAX_SAFE_INTEGER) ||
    (currentPosition.get(a.merchantListingId) ?? Number.MAX_SAFE_INTEGER) -
      (currentPosition.get(b.merchantListingId) ?? Number.MAX_SAFE_INTEGER)
  );
}

function evidenceRank(value: MarketDemandEvidence["repeatedEvidence"] | undefined): number {
  switch (value) {
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    case "NONE":
    default:
      return 0;
  }
}

function confidenceRank(value: MarketDemandEvidence["confidence"] | undefined): number {
  switch (value) {
    case "HIGH":
      return 2;
    case "MEDIUM":
      return 1;
    case "LOW":
    default:
      return 0;
  }
}

function repeatedEvidenceDistribution(items: MlAffiliateQueueItem[]): Record<string, number> {
  const distribution: Record<string, number> = { HIGH: 0, MEDIUM: 0, LOW: 0, NONE: 0, unavailable: 0 };
  for (const item of items) {
    const key = item.marketDemandEvidence?.repeatedEvidence ?? "unavailable";
    distribution[key] = (distribution[key] ?? 0) + 1;
  }
  return distribution;
}

function toMovement(
  item: MlAffiliateQueueItem,
  currentPosition: Map<string, number>,
  shadowPosition: Map<string, number>,
): MlAffiliateQueueShadowMovement {
  const current = currentPosition.get(item.merchantListingId)!;
  const shadow = shadowPosition.get(item.merchantListingId)!;
  return { item, currentPosition: current, shadowPosition: shadow, delta: current - shadow };
}
