import { prisma } from "@/lib/db";
import { getRemarketingProvider } from "@/lib/remarketing";
import {
  ALL_MARKETPLACES,
  PRIMARY_PUBLIC_MARKETPLACE,
  getAmazonMarketplaceConfig,
} from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";
import { getMerchantPublicationReadinessSummary } from "@/lib/queries/public-product";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getTodayStats() {
  const since = startOfToday();

  const [
    listingsUpdatedToday,
    pagesPublishedToday,
    pagesRejectedToday,
    affiliateClicksToday,
    runsToday,
  ] = await Promise.all([
    prisma.merchantListing.count({
      where: {
        active: true,
        updatedAt: { gte: since },
        merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } },
      },
    }),
    prisma.generatedContent.count({
      where: { status: "PUBLISHED", publishedAt: { gte: since } },
    }),
    prisma.generatedContent.count({
      where: { status: "REJECTED", updatedAt: { gte: since } },
    }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: since } } }),
    prisma.automationRun.findMany({ where: { startedAt: { gte: since } } }),
  ]);

  const automationErrorsToday = runsToday.reduce((sum, r) => sum + r.errors, 0);
  const automationFailedToday = runsToday.filter(
    (r) => r.status === "FAILED",
  ).length;
  const automationPartialToday = runsToday.filter(
    (r) => r.status === "PARTIAL",
  ).length;

  return {
    listingsUpdatedToday,
    pagesPublishedToday,
    pagesRejectedToday,
    affiliateClicksToday,
    automationErrorsToday,
    automationFailedToday,
    automationPartialToday,
  };
}

export async function getWeeklyStats() {
  const since = daysAgo(7);

  const [clicksByPage, failedJobs] = await Promise.all([
    prisma.affiliateClick.groupBy({
      by: ["pageType", "pageSlug"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { pageSlug: "desc" } },
      take: 10,
    }),
    prisma.automationRun.findMany({
      where: {
        startedAt: { gte: since },
        status: { in: ["FAILED", "PARTIAL"] },
      },
      orderBy: { startedAt: "desc" },
      take: 10,
      }),
    ]);

  const productPageSlugs = clicksByPage
    .filter((c) => c.pageType === "product")
    .map((c) => c.pageSlug);
  const [legacyProducts, canonicals, merchantListings] =
    productPageSlugs.length > 0
      ? await Promise.all([
          prisma.product.findMany({
            where: { slug: { in: productPageSlugs } },
            select: { slug: true, title: true },
          }),
          prisma.canonicalProduct.findMany({
            where: { publicSlug: { in: productPageSlugs } },
            select: { publicSlug: true, title: true },
          }),
          prisma.merchantListing.findMany({
            where: { slug: { in: productPageSlugs } },
            select: {
              slug: true,
              externalId: true,
              signals: { orderBy: { observedAt: "desc" }, take: 1 },
            },
          }),
        ])
      : [[], [], []];
  const titleBySlug = new Map<string, string>();
  for (const product of legacyProducts) titleBySlug.set(product.slug, product.title);
  for (const canonical of canonicals) {
    if (canonical.publicSlug) titleBySlug.set(canonical.publicSlug, canonical.title);
  }
  for (const listing of merchantListings) {
    if (!listing.slug) continue;
    const raw = listing.signals[0]?.raw as { productName?: string; title?: string } | null | undefined;
    titleBySlug.set(listing.slug, raw?.productName ?? raw?.title ?? listing.externalId);
  }

  return {
    topProductPagesByClicks: clicksByPage
      .filter((c) => c.pageType === "product")
      .slice(0, 5)
      .map((c) => ({
        pageType: c.pageType,
        pageSlug: c.pageSlug,
        productTitle: titleBySlug.get(c.pageSlug) ?? null,
        clicks: c._count._all,
      })),
    topPagesByClicks: clicksByPage.map((c) => ({
      pageType: c.pageType,
      pageSlug: c.pageSlug,
      clicks: c._count._all,
    })),
    failedJobs,
  };
}

export async function getPriorityBreakdown(
  marketplace: MarketplaceCode = PRIMARY_PUBLIC_MARKETPLACE,
) {
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
  const sevenDaysAgo = daysAgo(7);
  const [
    pageviews,
    searches,
    clicksToday,
    clicksLast7Days,
    clicksTodayByMerchant,
  ] = await Promise.all([
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.searchEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: since } } }),
    prisma.affiliateClick.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.affiliateClick.groupBy({
      by: ["merchantId", "provider"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
  ]);
  const merchantIds = clicksTodayByMerchant
    .map((row) => row.merchantId)
    .filter((id): id is string => id !== null);
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true, code: true },
  });
  const merchantById = new Map(merchants.map((m) => [m.id, m.code]));
  const clicksByMerchant = { mercadoLivre: 0, shopee: 0, amazon: 0, other: 0 };
  for (const row of clicksTodayByMerchant) {
    const code = row.merchantId
      ? merchantById.get(row.merchantId)
      : row.provider;
    if (code === "MERCADO_LIVRE")
      clicksByMerchant.mercadoLivre += row._count._all;
    else if (code === "SHOPEE") clicksByMerchant.shopee += row._count._all;
    else if (code === "AMAZON") clicksByMerchant.amazon += row._count._all;
    else clicksByMerchant.other += row._count._all;
  }
  return {
    pageviews,
    searches,
    clicksToday,
    clicksLast7Days,
    clicksByMerchant,
  };
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
  const [publicationGate, opportunities] = await Promise.all([
    getMerchantPublicationReadinessSummary(),
    prisma.searchOpportunity.count({ where: { status: "PENDING" } }),
  ]);
  return { ...publicationGate, opportunities };
}

export async function getCurrentCatalogOverview() {
  const [
    merchantListingsTotal,
    mercadoLivreListings,
    shopeeListings,
    canonicalProducts,
    activeAffiliateLinks,
  ] = await Promise.all([
    prisma.merchantListing.count({
      where: {
        active: true,
        merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } },
      },
    }),
    prisma.merchantListing.count({
      where: { active: true, merchant: { code: "MERCADO_LIVRE" } },
    }),
    prisma.merchantListing.count({
      where: { active: true, merchant: { code: "SHOPEE" } },
    }),
    prisma.canonicalProduct.count({ where: { active: true } }),
    prisma.affiliateLinkRegistry.count({
      where: {
        status: "ACTIVE",
        merchant: { code: { in: ["SHOPEE", "MERCADO_LIVRE"] } },
      },
    }),
  ]);

  return {
    merchantListingsTotal,
    mercadoLivreListings,
    shopeeListings,
    canonicalProducts,
    activeAffiliateLinks,
  };
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
export async function getCatalogSnapshot(
  marketplace: MarketplaceCode,
): Promise<CatalogSnapshot> {
  const enabled = getAmazonMarketplaceConfig(marketplace).enabled;

  const [
    totalProducts,
    activeProducts,
    priorityRows,
    lastRefreshRun,
    clicksLast7Days,
  ] = await Promise.all([
    prisma.product.count({ where: { marketplace } }),
    prisma.product.count({ where: { marketplace, active: true } }),
    prisma.product.groupBy({
      by: ["updatePriority"],
      where: { marketplace, active: true },
      _count: { _all: true },
    }),
    prisma.automationRun.findFirst({
      where: {
        marketplace,
        job: { in: [...CATALOG_REFRESH_JOBS] },
        status: "SUCCESS",
      },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.affiliateClick.count({
      where: { createdAt: { gte: daysAgo(7) }, product: { marketplace } },
    }),
  ]);

  const priorityBreakdown = { HOT: 0, WARM: 0, COLD: 0 };
  for (const row of priorityRows)
    priorityBreakdown[row.updatePriority] = row._count._all;

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
export async function getUnexpectedCatalogAlerts(): Promise<
  UnexpectedCatalogAlert[]
> {
  const alerts: UnexpectedCatalogAlert[] = [];
  for (const marketplace of ALL_MARKETPLACES) {
    if (getAmazonMarketplaceConfig(marketplace).enabled) continue;
    const productCount = await prisma.product.count({ where: { marketplace } });
    if (productCount > 0) alerts.push({ marketplace, productCount });
  }
  return alerts;
}
