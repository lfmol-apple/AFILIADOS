import { prisma } from "@/lib/db";
import { getRemarketingProvider } from "@/lib/remarketing";
import {
  ALL_MARKETPLACES,
  PRIMARY_PUBLIC_MARKETPLACE,
  getAmazonMarketplaceConfig,
} from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * These operational widgets (today/week/priority/traffic) are scoped to
 * PRIMARY_PUBLIC_MARKETPLACE (BR) rather than left global — with only BR
 * enabled today this is a no-op filter, but it stops the numbers from
 * silently starting to blend in US rows the moment a second marketplace
 * gets any data (project brief Sprint 4 section 10). Per-marketplace
 * catalog detail lives in getCatalogSnapshot() below.
 */
export async function getTodayStats(marketplace: MarketplaceCode = PRIMARY_PUBLIC_MARKETPLACE) {
  const since = startOfToday();

  const [
    productsMonitored,
    pricesUpdatedToday,
    pagesPublished,
    pagesRejected,
    clicksToday,
    runsToday,
  ] = await Promise.all([
    prisma.product.count({ where: { marketplace, active: true } }),
    prisma.offer.count({ where: { observedAt: { gte: since }, product: { marketplace } } }),
    prisma.generatedContent.count({ where: { status: "PUBLISHED" } }),
    prisma.generatedContent.count({ where: { status: "REJECTED" } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: since }, product: { marketplace } } }),
    prisma.automationRun.findMany({ where: { startedAt: { gte: since } } }),
  ]);

  const dropsDetectedToday = runsToday
    .filter((r) => r.job === "CALCULATE_OPPORTUNITIES" && r.marketplace === marketplace)
    .reduce((sum, r) => {
      const meta = r.metadata as { priceDropsDetected?: number } | null;
      return sum + (meta?.priceDropsDetected ?? 0);
    }, 0);

  const automationErrorsToday = runsToday.reduce((sum, r) => sum + r.errors, 0);

  return {
    productsMonitored,
    pricesUpdatedToday,
    dropsDetectedToday,
    pagesPublished,
    pagesRejected,
    clicksToday,
    automationErrorsToday,
  };
}

export async function getWeeklyStats(marketplace: MarketplaceCode = PRIMARY_PUBLIC_MARKETPLACE) {
  const since = daysAgo(7);

  const [clicksByProduct, clicksByPage, biggestDrops, failedJobs] =
    await Promise.all([
      prisma.affiliateClick.groupBy({
        by: ["productId"],
        where: { createdAt: { gte: since }, product: { marketplace } },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 5,
      }),
      prisma.affiliateClick.groupBy({
        by: ["pageType", "pageSlug"],
        where: { createdAt: { gte: since }, product: { marketplace } },
        _count: { _all: true },
        orderBy: { _count: { pageSlug: "desc" } },
        take: 5,
      }),
      prisma.priceStats.findMany({
        where: { dropPercentage: { gt: 0 }, product: { marketplace } },
        orderBy: { dropPercentage: "desc" },
        take: 5,
        include: { product: { select: { title: true, slug: true } } },
      }),
      prisma.automationRun.findMany({
        where: { startedAt: { gte: since }, status: "FAILED" },
        orderBy: { startedAt: "desc" },
        take: 10,
      }),
    ]);

  const productIds = clicksByProduct.map((c) => c.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true, slug: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const categoryStrength = await prisma.category.findMany({
    where: { active: true },
    include: { _count: { select: { products: { where: { marketplace, active: true } } } } },
    orderBy: { products: { _count: "desc" } },
    take: 5,
  });

  return {
    topProductsByClicks: clicksByProduct.map((c) => ({
      product: productMap.get(c.productId),
      clicks: c._count._all,
    })),
    topPagesByClicks: clicksByPage.map((c) => ({
      pageType: c.pageType,
      pageSlug: c.pageSlug,
      clicks: c._count._all,
    })),
    biggestDrops,
    failedJobs,
    categoryStrength,
  };
}

export async function getPriorityBreakdown(marketplace: MarketplaceCode = PRIMARY_PUBLIC_MARKETPLACE) {
  const rows = await prisma.product.groupBy({
    by: ["updatePriority"],
    where: { marketplace, active: true },
    _count: { _all: true },
  });
  const byPriority = { HOT: 0, WARM: 0, COLD: 0 };
  for (const row of rows) byPriority[row.updatePriority] = row._count._all;
  return byPriority;
}

export async function getTrafficOverview() {
  const since = startOfToday();
  const [pageviews, searches, clicks] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.searchEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: since } } }),
  ]);
  const ctr =
    pageviews > 0 ? Math.round((clicks / pageviews) * 1000) / 10 : null;
  return { pageviews, searches, clicks, ctr };
}

/** Most recent AutomationRun per job name, for the automation section of
 * /admin. Derived from real rows, not a hardcoded job list, so it stays
 * correct even if jobs are renamed/added. */
export async function getLatestJobRuns() {
  const distinctJobs = await prisma.automationRun.findMany({
    distinct: ["job"],
    orderBy: { startedAt: "desc" },
    select: { job: true },
  });

  const latestRuns = await Promise.all(
    distinctJobs.map((j) =>
      prisma.automationRun.findFirst({
        where: { job: j.job },
        orderBy: { startedAt: "desc" },
      }),
    ),
  );

  return latestRuns
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .map((run) => ({
      job: run.job,
      marketplace: run.marketplace,
      status: run.status,
      startedAt: run.startedAt,
      durationMs: run.finishedAt
        ? run.finishedAt.getTime() - run.startedAt.getTime()
        : null,
      processed: run.processed,
      errors: run.errors,
    }))
    .sort((a, b) => a.job.localeCompare(b.job));
}

export async function getSeoStatus() {
  const [publishable, rejected, noindexed, opportunities] = await Promise.all([
    prisma.generatedContent.count({
      where: { status: "PUBLISHED", noindex: false },
    }),
    prisma.generatedContent.count({ where: { status: "REJECTED" } }),
    prisma.generatedContent.count({
      where: { status: "PUBLISHED", noindex: true },
    }),
    prisma.searchOpportunity.count({ where: { status: "PENDING" } }),
  ]);
  return { publishable, rejected, noindexed, opportunities };
}

export async function getPrivacyStatus() {
  const [
    analyticsGranted,
    analyticsDenied,
    marketingGranted,
    marketingDenied,
    total,
  ] = await Promise.all([
    prisma.consentRecord.count({ where: { analytics: "GRANTED" } }),
    prisma.consentRecord.count({ where: { analytics: "DENIED" } }),
    prisma.consentRecord.count({ where: { marketing: "GRANTED" } }),
    prisma.consentRecord.count({ where: { marketing: "DENIED" } }),
    prisma.consentRecord.count(),
  ]);
  return {
    analyticsGranted,
    analyticsDenied,
    marketingGranted,
    marketingDenied,
    total,
    remarketingProvider: getRemarketingProvider().name,
  };
}

const CATALOG_REFRESH_JOBS = [
  "DISCOVER_PRODUCTS",
  "REFRESH_PRIORITY_PRODUCTS",
  "REFRESH_CATALOG",
] as const;

export interface CatalogSnapshot {
  marketplace: MarketplaceCode;
  enabled: boolean;
  totalProducts: number;
  activeProducts: number;
  priorityBreakdown: { HOT: number; WARM: number; COLD: number };
  lastRefreshAt: Date | null;
  clicksLast7Days: number;
}

/**
 * Backs the admin "CATÁLOGO BR" / "CATÁLOGO US" sections (project brief
 * Sprint 4 section 10). Calling this with marketplace: "US" while US is
 * disabled is expected to return all-zero operational numbers — that's the
 * honest state, not a bug — `enabled: false` is what the admin UI uses to
 * render it as "disabled" rather than "empty."
 */
export async function getCatalogSnapshot(marketplace: MarketplaceCode): Promise<CatalogSnapshot> {
  const enabled = getAmazonMarketplaceConfig(marketplace).enabled;

  const [totalProducts, activeProducts, priorityRows, lastRefreshRun, clicksLast7Days] =
    await Promise.all([
      prisma.product.count({ where: { marketplace } }),
      prisma.product.count({ where: { marketplace, active: true } }),
      prisma.product.groupBy({
        by: ["updatePriority"],
        where: { marketplace, active: true },
        _count: { _all: true },
      }),
      prisma.automationRun.findFirst({
        where: { marketplace, job: { in: [...CATALOG_REFRESH_JOBS] }, status: "SUCCESS" },
        orderBy: { finishedAt: "desc" },
      }),
      prisma.affiliateClick.count({
        where: { createdAt: { gte: daysAgo(7) }, product: { marketplace } },
      }),
    ]);

  const priorityBreakdown = { HOT: 0, WARM: 0, COLD: 0 };
  for (const row of priorityRows) priorityBreakdown[row.updatePriority] = row._count._all;

  return {
    marketplace,
    enabled,
    totalProducts,
    activeProducts,
    priorityBreakdown,
    lastRefreshAt: lastRefreshRun?.finishedAt ?? null,
    clicksLast7Days,
  };
}

export interface UnexpectedCatalogAlert {
  marketplace: MarketplaceCode;
  productCount: number;
}

/**
 * Safety net for project brief Sprint 4 section 10: "se por acidente
 * existir algum Product US enquanto US está desativado, deve haver um
 * alerta." Returns one entry per marketplace that has Product rows despite
 * being disabled in config — should always be empty in normal operation.
 */
export async function getUnexpectedCatalogAlerts(): Promise<UnexpectedCatalogAlert[]> {
  const alerts: UnexpectedCatalogAlert[] = [];
  for (const marketplace of ALL_MARKETPLACES) {
    if (getAmazonMarketplaceConfig(marketplace).enabled) continue;
    const productCount = await prisma.product.count({ where: { marketplace } });
    if (productCount > 0) alerts.push({ marketplace, productCount });
  }
  return alerts;
}
