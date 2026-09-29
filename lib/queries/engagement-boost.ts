import { prisma } from "@/lib/db";
import { startOfDayInBrasilDaysAgo } from "@/lib/time/brasil";
import { REAL_VISITOR_CLICKS_SQL } from "@/lib/admin/owner-traffic";

/**
 * Real on-site engagement (a click to buy, a view of the product's own page)
 * folded into /ofertas's ranking as a small, capped nudge — owner request,
 * 2026-09-29: "rotacionar os mais vistos e procurados na frente dos demais".
 * Deliberately never replaces opportunitySignal, only adds to it, and only
 * once there is enough real signal to trust — see computeEngagementBoost.
 */

export const ENGAGEMENT_BOOST_WINDOW_DAYS = 30;

/** Below this many weighted signals, the boost is zero. With today's still-
 * low traffic, one lucky click must never catapult a product to the top. */
const MIN_WEIGHTED_SIGNAL = 3;
/** Log-scaled the same judgment-call way salesToScore already maps a real
 * count onto this codebase's 0-100 opportunitySignal scale
 * (lib/services/shopee-cycle-collector.ts) — sustained engagement moves the
 * needle, but doubling the clicks never doubles the boost. */
const BOOST_SCALE = 12;
/** Cap: on average two 0-100 components make up opportunitySignal, so one
 * maxed-out component alone can already swing the average by 50 — a +25 cap
 * keeps engagement a real nudge, never the dominant factor. */
const MAX_BOOST = 25;

export interface EngagementBoostInput {
  /** Real outbound clicks (AffiliateClick) — counts double a view, closer
   * to purchase intent. */
  clicks: number;
  /** Real views of the product's own /produto/[slug] page (PageView). */
  views: number;
}

export function computeEngagementBoost({
  clicks,
  views,
}: EngagementBoostInput): number {
  const raw = clicks * 2 + views;
  if (raw < MIN_WEIGHTED_SIGNAL) return 0;
  return Math.min(MAX_BOOST, Math.round(Math.log10(raw + 1) * BOOST_SCALE));
}

export interface EngagementSignals {
  /** Real click count keyed by the same id a UnifiedOfferCard uses —
   * AffiliateClick.productId for Amazon, .merchantListingId for Shopee/ML
   * (see mapAmazonProductToUnifiedCard and the Shopee/ML branches in
   * getUnifiedMerchantOffers, which set `id` to exactly those values). */
  clicksByCardId: Map<string, number>;
  /** Real pageview count keyed by the product's own page slug
   * (PageView.pageSlug, pageType "product" — set from data.slug in
   * app/produto/[slug]/MerchantProductView.tsx). */
  viewsBySlug: Map<string, number>;
}

/**
 * Real signals over the trailing window. Never the owner's own: clicks are
 * already filtered by REAL_VISITOR_CLICKS_SQL, and the owner's pageviews are
 * never stored in the first place (app/api/analytics/pageview/route.ts).
 */
export async function getEngagementSignals(
  days: number = ENGAGEMENT_BOOST_WINDOW_DAYS,
): Promise<EngagementSignals> {
  const since = startOfDayInBrasilDaysAgo(days);

  const [clickRows, viewRows] = await Promise.all([
    prisma.$queryRaw<{ card_id: string | null; clicks: bigint }[]>`
      select coalesce(ac."productId", ac."merchantListingId") as card_id, count(*) as clicks
      from "AffiliateClick" ac
      where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}
      group by 1
    `,
    prisma.$queryRaw<{ pageSlug: string; views: bigint }[]>`
      select "pageSlug", count(*) as views
      from "PageView"
      where "pageType" = 'product' and "createdAt" >= ${since}
      group by 1
    `,
  ]);

  return {
    clicksByCardId: new Map(
      clickRows
        .filter(
          (r): r is { card_id: string; clicks: bigint } => r.card_id !== null,
        )
        .map((r) => [r.card_id, Number(r.clicks)]),
    ),
    viewsBySlug: new Map(viewRows.map((r) => [r.pageSlug, Number(r.views)])),
  };
}

function slugFromDetailPath(href: string | null | undefined): string | null {
  if (!href || !href.startsWith("/produto/")) return null;
  return href.slice("/produto/".length);
}

/**
 * Adds the engagement boost to each card's opportunitySignal — never
 * replaces it, never touches a card with no real signal at all. Pure: takes
 * the signals already fetched, so this is trivial to unit test without a
 * database.
 */
export function applyEngagementBoost<
  T extends {
    id: string;
    href: string | null;
    detailHref?: string;
    opportunitySignal: number | null;
  },
>(cards: T[], signals: EngagementSignals): T[] {
  return cards.map((card) => {
    const clicks = signals.clicksByCardId.get(card.id) ?? 0;
    const slug = slugFromDetailPath(card.detailHref ?? card.href);
    const views = slug ? (signals.viewsBySlug.get(slug) ?? 0) : 0;
    const boost = computeEngagementBoost({ clicks, views });
    if (boost === 0) return card;
    return {
      ...card,
      opportunitySignal: (card.opportunitySignal ?? 0) + boost,
    };
  });
}
