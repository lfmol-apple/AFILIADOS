import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  detectPriceDrop,
  detectRankEvent,
  detectHighQualityOffer,
  detectAffiliateLinkActivated,
  calculateRadarPriority,
  type RadarEvent,
  type RadarEventType,
} from "@/lib/services/radar";
import {
  selectCandidateListingIds,
  selectBestOfferIdsPerCanonicalProduct,
  bestByNonCommissionSignal,
} from "@/lib/queries/candidate-pool";

/**
 * Radar — query-time event assembly. See lib/services/radar.ts's doc
 * comment for why this stays derivation-only (no persisted `RadarEvent`
 * table). The catalog can hold hundreds of CanonicalProducts and tens of
 * thousands of MerchantListing rows — every query in this file is bounded
 * (candidatePoolSize) and batched (no per-candidate round trip), so the
 * work done per request stays flat as the catalog grows instead of
 * scanning/looping over the full table (performance hotfix, 2026-09-12 —
 * the previous unbounded version took Home from ~4s to 32.6s in
 * production once the catalog reached real scale).
 *
 * Revisit the "no persisted table" decision once any of these becomes
 * true: real duplicate-across-requests noise appears (a fresh price
 * snapshot flips the same event on/off within seconds), a "mark as
 * seen/published" lifecycle is needed, or per-event click tracking needs
 * a stable id that survives beyond one signal's lifetime.
 */

/** How many candidate listings to fetch PER MERCHANT before deriving
 * events and sorting by priority — never the whole table. Mirrors
 * lib/queries/unified-offers.ts's identical constant/reasoning: `limit *
 * 5`, capped at 200, gives the in-memory priority sort real room to find
 * the true top N without an unbounded scan. */
const CANDIDATE_POOL_MULTIPLIER = 5;
const CANDIDATE_POOL_CEILING = 200;

function candidatePoolSize(limit: number): number {
  return Math.min(limit * CANDIDATE_POOL_MULTIPLIER, CANDIDATE_POOL_CEILING);
}

/** Small, bounded recent-signal window — enough headroom to find two real,
 * price-bearing observations for detectPriceDrop() even when some recent
 * signals lack a parseable price (never assume the two most recent rows
 * both have one), without ever loading a listing's entire signal history. */
const RECENT_SIGNALS_WINDOW = 10;

/** Mirrors lib/queries/unified-offers.ts's nonCommissionSignal() — same
 * commission-free average of demand+offerQuality, kept as a local copy
 * (not extracted/imported) for the same reason the rest of this file
 * mirrors that module's query shapes instead of sharing code: each file
 * owns its own tested behavior. Used only to pick which real offer
 * sibling represents an ML catalog product (bestByNonCommissionSignal
 * below) — never to touch calculateRadarPriority's own, deliberately
 * commission-aware tie-break nudge. */
function nonCommissionSignal(components: unknown): number | null {
  const c = components as
    | { demand?: { value: number | null }; offerQuality?: { value: number | null } }
    | null
    | undefined;
  const values = [c?.demand?.value, c?.offerQuality?.value].filter(
    (v): v is number => typeof v === "number",
  );
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export interface RadarFeedItem {
  event: RadarEvent;
  priority: number;
  merchant: "SHOPEE" | "MERCADO_LIVRE";
  title: string;
  imageUrl: string | null;
  /** Only set once AffiliateLinkRegistry is ACTIVE — same fail-closed
   * rule as everywhere else in this project. Null means: show the fact,
   * never a commercial CTA. */
  ctaHref: string | null;
}

const MERCHANT_TO_CTA_SEGMENT: Record<"SHOPEE" | "MERCADO_LIVRE", string> = {
  SHOPEE: "shopee",
  MERCADO_LIVRE: "mercado-livre",
};

function buildCtaHref(
  merchant: "SHOPEE" | "MERCADO_LIVRE",
  externalId: string,
  linkActive: boolean,
): string | null {
  if (!linkActive) return null;
  return `/go/${MERCHANT_TO_CTA_SEGMENT[merchant]}/${encodeURIComponent(externalId)}?pageType=radar&pageSlug=radar&source=radar_feed`;
}

/** Types safe to show to a public visitor — AFFILIATE_LINK_ACTIVATED is an
 * internal/business fact (project brief section 5.D: "não use isso como
 * sinal de qualidade do consumidor"), so it's excluded from the default
 * public feed but still available to the admin feed below. */
const PUBLIC_EVENT_TYPES: RadarEventType[] = [
  "PRICE_DROP",
  "HIGH_QUALITY_OFFER",
  "BESTSELLER_ENTRY",
  "TREND_ENTRY",
];

export async function getPublicRadarFeed(limit: number = 12): Promise<RadarFeedItem[]> {
  const all = await getAllRadarEvents(candidatePoolSize(limit));
  return all.filter((item) => PUBLIC_EVENT_TYPES.includes(item.event.type)).slice(0, limit);
}

export async function getAdminRadarFeed(limit: number = 50): Promise<RadarFeedItem[]> {
  const all = await getAllRadarEvents(candidatePoolSize(limit));
  return all.slice(0, limit);
}

async function getAllRadarEvents(poolSize: number): Promise<RadarFeedItem[]> {
  const [shopeeItems, mlItems] = await Promise.all([
    collectShopeeEvents(poolSize),
    collectMercadoLivreEvents(poolSize),
  ]);
  const items = [...shopeeItems, ...mlItems];
  items.sort((a, b) => b.priority - a.priority);
  return items;
}

async function collectShopeeEvents(poolSize: number): Promise<RadarFeedItem[]> {
  // Pool membership is commission-free (candidate-pool.ts) — see
  // getUnifiedMerchantOffers's identical fix/reasoning. Hydration below
  // is a plain `id: in` fetch; order doesn't matter there.
  const shopeeIds = await selectCandidateListingIds(
    Prisma.sql`ml.active = true AND m.code = 'SHOPEE' AND ms.id IS NOT NULL`,
    poolSize,
  );
  const listings = await prisma.merchantListing.findMany({
    where: { id: { in: shopeeIds } },
    include: {
      monetizationScore: true,
      affiliateLink: true,
      // Bounded, most-recent-first window — enough to find two real,
      // price-bearing observations even if a recent signal or two lacks
      // one, without loading a listing's entire signal history.
      signals: { orderBy: { observedAt: "desc" }, take: RECENT_SIGNALS_WINDOW },
    },
  });

  const results: RadarFeedItem[] = [];
  for (const listing of listings) {
    const priceHistory = listing.signals
      .map((s) => {
        const raw = s.raw as { priceMin?: string } | null;
        const price = raw?.priceMin ? Number(raw.priceMin) : null;
        return price !== null && !Number.isNaN(price) ? { price, observedAt: s.observedAt } : null;
      })
      .filter((p): p is { price: number; observedAt: Date } => p !== null);

    // Signals are fetched newest-first (desc) — index 0 is the latest.
    const latest = listing.signals[0];
    const latestRaw = latest?.raw as { productName?: string; imageUrl?: string; rating?: number } | null;
    const title = latestRaw?.productName ?? listing.externalId;
    const imageUrl = latestRaw?.imageUrl ?? null;
    const linkActive = listing.affiliateLink?.status === "ACTIVE";
    const ctaHref = buildCtaHref("SHOPEE", listing.externalId, linkActive);

    const candidateEvents = [
      detectPriceDrop(listing.id, priceHistory),
      latest
        ? detectHighQualityOffer(listing.id, {
            rating: latest.rating ?? latestRaw?.rating ?? null,
            observedAt: latest.observedAt,
          })
        : null,
      linkActive && listing.affiliateLink
        ? detectAffiliateLinkActivated(listing.id, { activatedAt: listing.affiliateLink.updatedAt })
        : null,
    ].filter((e): e is RadarEvent => e !== null);

    for (const event of candidateEvents) {
      results.push({
        event,
        priority: calculateRadarPriority(event, { monetizationScore: listing.monetizationScore?.score }),
        merchant: "SHOPEE",
        title,
        imageUrl,
        ctaHref,
      });
    }
  }
  return results;
}

async function collectMercadoLivreEvents(poolSize: number): Promise<RadarFeedItem[]> {
  // Catalog rows: the demand signal (rank) lives here — see
  // scripts/ml-demand-e2e-check.ts / scripts/ml-enrich-offers.ts. Pool
  // membership is commission-free (candidate-pool.ts) — same fix/
  // reasoning as getUnifiedMerchantOffers and collectShopeeEvents above.
  const mlIds = await selectCandidateListingIds(
    Prisma.sql`ml.active = true AND m.code = 'MERCADO_LIVRE' AND EXISTS (
      SELECT 1 FROM "MerchantListingSignal" mls
      WHERE mls."merchantListingId" = ml.id
      AND mls.source IN ('mercado_livre_highlights', 'mercado_livre_trends')
    )`,
    poolSize,
  );
  const catalogListings = await prisma.merchantListing.findMany({
    where: { id: { in: mlIds } },
    include: {
      monetizationScore: true,
      affiliateLink: true,
      canonicalProduct: { select: { title: true, imageUrl: true, specifications: true } },
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
    },
  });

  // Production incident (2026-09-13): a real Mercado Livre canonical
  // product can have 100-174 real offer siblings (average ~27) —
  // fetching every one of them for every candidate (as the previous
  // version did) pulled thousands of rows per request and hung the Home
  // page. Postgres picks the single best (commission-free) offer PER
  // canonical product directly via DISTINCT ON (candidate-pool.ts) —
  // bounded strictly by the number of canonical products in this pool.
  const canonicalProductIds = catalogListings
    .map((c) => c.canonicalProductId)
    .filter((id): id is string => id !== null);
  const catalogListingIds = catalogListings.map((c) => c.id);
  const bestOfferIds = await selectBestOfferIdsPerCanonicalProduct(canonicalProductIds, catalogListingIds);
  const bestOffers = bestOfferIds.length
    ? await prisma.merchantListing.findMany({
        where: { id: { in: bestOfferIds } },
        include: {
          monetizationScore: true,
          signals: { orderBy: { observedAt: "desc" }, take: RECENT_SIGNALS_WINDOW },
        },
      })
    : [];
  const bestOfferByCanonicalId = bestByNonCommissionSignal(
    bestOffers,
    (offer) => nonCommissionSignal(offer.monetizationScore?.components) ?? -1,
  );

  const results: RadarFeedItem[] = [];
  for (const catalogListing of catalogListings) {
    const title = catalogListing.canonicalProduct?.title ?? catalogListing.externalId;
    const imageUrl = catalogListing.canonicalProduct?.imageUrl ?? null;
    const linkActive = catalogListing.affiliateLink?.status === "ACTIVE";
    // The public CTA always targets the catalog row's own externalId —
    // that's what AffiliateLinkRegistry is keyed to (Phase 2 decision,
    // unchanged: the affiliate link's actual destination is whatever URL
    // a human pasted, independent of which literal item page they used).
    const ctaHref = buildCtaHref("MERCADO_LIVRE", catalogListing.externalId, linkActive);

    const latestSignal = catalogListing.signals[0];
    const rankEvent = latestSignal
      ? detectRankEvent(catalogListing.id, {
          bestsellerRank: latestSignal.bestsellerRank,
          trendRank: latestSignal.trendRank,
          observedAt: latestSignal.observedAt,
        })
      : null;
    const linkEvent =
      linkActive && catalogListing.affiliateLink
        ? detectAffiliateLinkActivated(catalogListing.id, { activatedAt: catalogListing.affiliateLink.updatedAt })
        : null;

    for (const event of [rankEvent, linkEvent].filter((e): e is RadarEvent => e !== null)) {
      results.push({
        event,
        priority: calculateRadarPriority(event, { monetizationScore: catalogListing.monetizationScore?.score }),
        merchant: "MERCADO_LIVRE",
        title,
        imageUrl,
        ctaHref,
      });
    }

    // Real seller offers (scripts/ml-enrich-offers.ts) — price/condition/
    // shipping/seller facts live here, never on the catalog row. Only the
    // single best-scoring offer represents this product, same rule as
    // lib/queries/ml-affiliate-queue.ts (never one row per raw offer).
    // Looked up from the batch fetched above — never a per-listing query.
    if (!catalogListing.canonicalProductId) continue;
    const bestOffer = bestOfferByCanonicalId.get(catalogListing.canonicalProductId);
    if (!bestOffer) continue;

    const offerPriceHistory = bestOffer.signals
      .map((s) => {
        const raw = s.raw as { price?: number } | null;
        return raw?.price !== undefined ? { price: raw.price, observedAt: s.observedAt } : null;
      })
      .filter((p): p is { price: number; observedAt: Date } => p !== null);

    // Signals are fetched newest-first (desc) — index 0 is the latest.
    const latestOfferSignal = bestOffer.signals[0];
    const latestOfferRaw = latestOfferSignal?.raw as
      | { condition?: string; shipping?: { free_shipping?: boolean }; seller?: { levelId?: string | null } }
      | null;

    const offerEvents = [
      detectPriceDrop(catalogListing.id, offerPriceHistory), // keyed to the catalog row's id — one product identity
      latestOfferSignal
        ? detectHighQualityOffer(catalogListing.id, {
            offerQualityScore: bestOffer.monetizationScore?.components
              ? ((bestOffer.monetizationScore.components as { offerQuality?: { value?: number } })?.offerQuality
                  ?.value ?? undefined)
              : undefined,
            sellerReputationLevel: latestOfferRaw?.seller?.levelId ?? null,
            freeShipping: latestOfferRaw?.shipping?.free_shipping ?? null,
            condition: latestOfferRaw?.condition ?? null,
            observedAt: latestOfferSignal.observedAt,
          })
        : null,
    ].filter((e): e is RadarEvent => e !== null);

    for (const event of offerEvents) {
      results.push({
        event,
        priority: calculateRadarPriority(event, { monetizationScore: bestOffer.monetizationScore?.score }),
        merchant: "MERCADO_LIVRE",
        title,
        imageUrl,
        ctaHref,
      });
    }
  }
  return results;
}
