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

/**
 * Radar — query-time event assembly. See lib/services/radar.ts's doc
 * comment for why this stays derivation-only (no persisted `RadarEvent`
 * table) at today's real data volume (18 ML catalog products, ~180 real
 * offers, 12 Shopee listings — a handful of Prisma queries per request,
 * no N+1 loop over thousands of rows).
 *
 * Revisit that decision (add persistence) once any of these becomes true:
 * real duplicate-across-requests noise appears (a fresh price snapshot
 * flips the same event on/off within seconds), a "mark as seen/published"
 * lifecycle is needed, or per-event click tracking needs a stable id that
 * survives beyond one signal's lifetime.
 */

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
  const all = await getAllRadarEvents();
  return all.filter((item) => PUBLIC_EVENT_TYPES.includes(item.event.type)).slice(0, limit);
}

export async function getAdminRadarFeed(limit: number = 50): Promise<RadarFeedItem[]> {
  const all = await getAllRadarEvents();
  return all.slice(0, limit);
}

async function getAllRadarEvents(): Promise<RadarFeedItem[]> {
  const [shopeeItems, mlItems] = await Promise.all([collectShopeeEvents(), collectMercadoLivreEvents()]);
  const items = [...shopeeItems, ...mlItems];
  items.sort((a, b) => b.priority - a.priority);
  return items;
}

async function collectShopeeEvents(): Promise<RadarFeedItem[]> {
  const listings = await prisma.merchantListing.findMany({
    where: { active: true, merchant: { code: "SHOPEE" }, monetizationScore: { isNot: null } },
    include: {
      monetizationScore: true,
      affiliateLink: true,
      signals: { orderBy: { observedAt: "asc" } },
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

    const latest = listing.signals[listing.signals.length - 1];
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

async function collectMercadoLivreEvents(): Promise<RadarFeedItem[]> {
  // Catalog rows: the demand signal (rank) lives here — see
  // scripts/ml-demand-e2e-check.ts / scripts/ml-enrich-offers.ts.
  const catalogListings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: "MERCADO_LIVRE" },
      signals: { some: { source: { in: ["mercado_livre_highlights", "mercado_livre_trends"] } } },
    },
    include: {
      monetizationScore: true,
      affiliateLink: true,
      canonicalProduct: { select: { title: true, imageUrl: true, specifications: true } },
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
    },
  });

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
    if (!catalogListing.canonicalProductId) continue;
    const bestOffer = await prisma.merchantListing.findFirst({
      where: { canonicalProductId: catalogListing.canonicalProductId, id: { not: catalogListing.id } },
      include: { monetizationScore: true, signals: { orderBy: { observedAt: "asc" } } },
      orderBy: { monetizationScore: { score: "desc" } },
    });
    if (!bestOffer) continue;

    const offerPriceHistory = bestOffer.signals
      .map((s) => {
        const raw = s.raw as { price?: number } | null;
        return raw?.price !== undefined ? { price: raw.price, observedAt: s.observedAt } : null;
      })
      .filter((p): p is { price: number; observedAt: Date } => p !== null);

    const latestOfferSignal = bestOffer.signals[bestOffer.signals.length - 1];
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
