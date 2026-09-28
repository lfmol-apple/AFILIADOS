import { prisma } from "@/lib/db";
import { startOfDayInBrasilDaysAgo } from "@/lib/time/brasil";
import { REAL_VISITOR_CLICKS_SQL, realClicks } from "@/lib/admin/owner-traffic";

/**
 * Read-only click/traffic reporting for /admin/desempenho and the daily
 * email digest (jobs/daily-performance-digest.ts) — both consume the exact
 * same functions so the page and the email never disagree about a number.
 * Every count here is a real row count (AffiliateClick, PageView,
 * AutomationRun) — no estimated revenue/commission, no conversion formula
 * (project brief: "não crie agora uma fórmula falsa de conversão sem
 * dados" — same rule getOperationsSummary already follows).
 */

export type ClickMerchantCode = "MERCADO_LIVRE" | "SHOPEE" | "AMAZON";

export interface DailyMerchantClicks {
  day: string; // YYYY-MM-DD
  merchant: ClickMerchantCode;
  clicks: number;
}

/** One row per (day, merchant) that actually had at least one click —
 * callers that need a zero-filled continuous timeline (the chart) do that
 * client-side, same as the one-off SQL export this replaces. */
export async function getClicksDailyByMerchant(
  days: number,
): Promise<DailyMerchantClicks[]> {
  const since = startOfDayInBrasilDaysAgo(days);

  const rows = await prisma.$queryRaw<
    { day: Date; merchant: ClickMerchantCode | null; clicks: bigint }[]
  >`
    select date_trunc('day', (ac."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date as day,
           coalesce(m.code::text, 'AMAZON') as merchant,
           count(*) as clicks
    from "AffiliateClick" ac
    left join "Merchant" m on m.id = ac."merchantId"
    where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}
    group by 1, 2
    order by 1, 2
  `;

  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    merchant: (r.merchant ?? "AMAZON") as ClickMerchantCode,
    clicks: Number(r.clicks),
  }));
}

export interface DailyPageviews {
  day: string;
  pageviews: number;
}

export async function getPageviewsDaily(
  days: number,
): Promise<DailyPageviews[]> {
  const since = startOfDayInBrasilDaysAgo(days);

  const rows = await prisma.$queryRaw<{ day: Date; pageviews: bigint }[]>`
    select date_trunc('day', ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date as day, count(*) as pageviews
    from "PageView"
    where "createdAt" >= ${since}
    group by 1
    order by 1
  `;

  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    pageviews: Number(r.pageviews),
  }));
}

export interface TopClickedProduct {
  merchant: ClickMerchantCode;
  title: string;
  clicks: number;
  lastClickAt: Date;
}

/** Same COALESCE chain as the manual audit query: CanonicalProduct title
 * (Mercado Livre), then legacy Product title (Amazon), then the Shopee
 * MerchantListing's own lazily-generated slug — Shopee listings never get
 * a CanonicalProduct (see MerchantListing.slug doc comment in schema.prisma). */
export async function getTopProductsByClicks(
  days: number,
  limit = 15,
): Promise<TopClickedProduct[]> {
  const since = startOfDayInBrasilDaysAgo(days);

  const rows = await prisma.$queryRaw<
    {
      merchant: ClickMerchantCode | null;
      title: string;
      clicks: bigint;
      last_click: Date;
    }[]
  >`
    select coalesce(m.code::text, 'AMAZON') as merchant,
           coalesce(cp.title, p.title, ml.slug, ml."externalId", 'desconhecido') as title,
           count(*) as clicks,
           max(ac."createdAt") as last_click
    from "AffiliateClick" ac
    left join "Merchant" m on m.id = ac."merchantId"
    left join "CanonicalProduct" cp on cp.id = ac."canonicalProductId"
    left join "Product" p on p.id = ac."productId"
    left join "MerchantListing" ml on ml.id = ac."merchantListingId"
    where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}
    group by 1, 2
    order by clicks desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    merchant: (r.merchant ?? "AMAZON") as ClickMerchantCode,
    title: r.title,
    clicks: Number(r.clicks),
    lastClickAt: r.last_click,
  }));
}

export interface TopClickedProductMulti {
  merchant: ClickMerchantCode;
  title: string;
  clicks7d: number;
  clicks30d: number;
  clicksAllTime: number;
  lastClickAt: Date;
  firstClickAt: Date;
  /** "/produto/<slug>" when the click's product has a public page, else null
   * — some Shopee listings and every non-catalog Mercado Livre item don't. */
  href: string | null;
}

/**
 * The full "which products are people actually clicking" picture for
 * /admin/produtos-populares — one pass, three windows (7d/30d/all-time) so
 * a product's momentum shows without three separate queries. Real counts
 * only, same rule as the rest of this file. Ranked by clicksAllTime so a
 * proven long-term seller doesn't get buried by one noisy day.
 */
export async function getTopClickedProductsMulti(
  limit = 50,
): Promise<TopClickedProductMulti[]> {
  const since7d = startOfDayInBrasilDaysAgo(7);
  const since30d = startOfDayInBrasilDaysAgo(30);

  const rows = await prisma.$queryRaw<
    {
      merchant: ClickMerchantCode | null;
      title: string;
      href: string | null;
      clicks_7d: bigint;
      clicks_30d: bigint;
      clicks_all: bigint;
      first_click: Date;
      last_click: Date;
    }[]
  >`
    select coalesce(m.code::text, 'AMAZON') as merchant,
           coalesce(cp.title, p.title, ml.slug, ml."externalId", 'desconhecido') as title,
           case when coalesce(cp."publicSlug", p.slug, ml.slug) is not null
                then '/produto/' || coalesce(cp."publicSlug", p.slug, ml.slug)
                else null end as href,
           count(*) filter (where ac."createdAt" >= ${since7d}) as clicks_7d,
           count(*) filter (where ac."createdAt" >= ${since30d}) as clicks_30d,
           count(*) as clicks_all,
           min(ac."createdAt") as first_click,
           max(ac."createdAt") as last_click
    from "AffiliateClick" ac
    left join "Merchant" m on m.id = ac."merchantId"
    left join "CanonicalProduct" cp on cp.id = ac."canonicalProductId"
    left join "Product" p on p.id = ac."productId"
    left join "MerchantListing" ml on ml.id = ac."merchantListingId"
    where ${REAL_VISITOR_CLICKS_SQL}
    group by 1, 2, 3
    order by clicks_all desc
    limit ${limit}
  `;

  return rows.map((r) => ({
    merchant: (r.merchant ?? "AMAZON") as ClickMerchantCode,
    title: r.title,
    href: r.href,
    clicks7d: Number(r.clicks_7d),
    clicks30d: Number(r.clicks_30d),
    clicksAllTime: Number(r.clicks_all),
    firstClickAt: r.first_click,
    lastClickAt: r.last_click,
  }));
}

export interface ClickSourceBreakdown {
  source: string;
  pageType: string;
  clicks: number;
}

export async function getClickSourceBreakdown(
  days: number,
): Promise<ClickSourceBreakdown[]> {
  const since = startOfDayInBrasilDaysAgo(days);

  const rows = await prisma.$queryRaw<
    { source: string | null; page_type: string; clicks: bigint }[]
  >`
    select ac.source, ac."pageType" as page_type, count(*) as clicks
    from "AffiliateClick" ac
    where ac."createdAt" >= ${since} and ${REAL_VISITOR_CLICKS_SQL}
    group by 1, 2
    order by clicks desc
  `;

  return rows.map((r) => ({
    source: r.source ?? "(sem source)",
    pageType: r.page_type,
    clicks: Number(r.clicks),
  }));
}

export interface JobHealthSummary {
  job: string;
  success: number;
  partial: number;
  failed: number;
}

export async function getAutomationHealthSummary(
  days: number,
): Promise<JobHealthSummary[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.automationRun.groupBy({
    by: ["job", "status"],
    where: { startedAt: { gte: since } },
    _count: { _all: true },
  });

  const byJob = new Map<string, JobHealthSummary>();
  for (const row of rows) {
    const entry = byJob.get(row.job) ?? {
      job: row.job,
      success: 0,
      partial: 0,
      failed: 0,
    };
    if (row.status === "SUCCESS") entry.success += row._count._all;
    else if (row.status === "PARTIAL") entry.partial += row._count._all;
    else if (row.status === "FAILED") entry.failed += row._count._all;
    byJob.set(row.job, entry);
  }
  return Array.from(byJob.values()).sort((a, b) => a.job.localeCompare(b.job));
}

export interface PerformanceSummary {
  clicksLast7d: number;
  clicksPrev7d: number;
  pageviewsLast7d: number;
  pageviewsPrev7d: number;
  totalClicks: number;
  totalPageviews: number;
  activeLinksMl: number;
  activeLinksShopee: number;
  pendingLinksMl: number;
}

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);

  const [
    clicksLast7d,
    clicksPrev7d,
    pageviewsLast7d,
    pageviewsPrev7d,
    totalClicks,
    totalPageviews,
    activeLinksMl,
    activeLinksShopee,
    pendingLinksMl,
  ] = await Promise.all([
    prisma.affiliateClick.count({
      where: realClicks({ createdAt: { gte: sevenDaysAgo } }),
    }),
    prisma.affiliateClick.count({
      where: realClicks({
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      }),
    }),
    prisma.pageView.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.pageView.count({
      where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    }),
    prisma.affiliateClick.count({ where: realClicks() }),
    prisma.pageView.count(),
    prisma.affiliateLinkRegistry.count({
      where: { status: "ACTIVE", merchant: { code: "MERCADO_LIVRE" } },
    }),
    prisma.affiliateLinkRegistry.count({
      where: { status: "ACTIVE", merchant: { code: "SHOPEE" } },
    }),
    prisma.affiliateLinkRegistry.count({
      where: { status: "PENDING", merchant: { code: "MERCADO_LIVRE" } },
    }),
  ]);

  return {
    clicksLast7d,
    clicksPrev7d,
    pageviewsLast7d,
    pageviewsPrev7d,
    totalClicks,
    totalPageviews,
    activeLinksMl,
    activeLinksShopee,
    pendingLinksMl,
  };
}

export interface PerformanceDashboardData {
  summary: PerformanceSummary;
  clicksDaily: DailyMerchantClicks[];
  pageviewsDaily: DailyPageviews[];
  topProducts: TopClickedProduct[];
  clickSources: ClickSourceBreakdown[];
  automation: JobHealthSummary[];
}

/** Single entry point the admin page and the email digest both call —
 * keeps the two views built from one query pass instead of drifting. */
export async function getPerformanceDashboardData(
  trendDays = 14,
  automationDays = 10,
): Promise<PerformanceDashboardData> {
  const [
    summary,
    clicksDaily,
    pageviewsDaily,
    topProducts,
    clickSources,
    automation,
  ] = await Promise.all([
    getPerformanceSummary(),
    getClicksDailyByMerchant(trendDays),
    getPageviewsDaily(trendDays),
    getTopProductsByClicks(trendDays, 15),
    getClickSourceBreakdown(trendDays),
    getAutomationHealthSummary(automationDays),
  ]);

  return {
    summary,
    clicksDaily,
    pageviewsDaily,
    topProducts,
    clickSources,
    automation,
  };
}
