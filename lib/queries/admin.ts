import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { checkLiveActivationReadiness, isPolicyReviewRecent } from "@/lib/amazon/policy-guard";
import { getRemarketingProvider } from "@/lib/remarketing";

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
    productsMonitored,
    pricesUpdatedToday,
    pagesPublished,
    pagesRejected,
    clicksToday,
    runsToday,
  ] = await Promise.all([
    prisma.product.count({ where: { active: true } }),
    prisma.offer.count({ where: { observedAt: { gte: since } } }),
    prisma.generatedContent.count({ where: { status: "PUBLISHED" } }),
    prisma.generatedContent.count({ where: { status: "REJECTED" } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: since } } }),
    prisma.automationRun.findMany({ where: { startedAt: { gte: since } } }),
  ]);

  const dropsDetectedToday = runsToday
    .filter((r) => r.job === "CALCULATE_OPPORTUNITIES")
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

export async function getWeeklyStats() {
  const since = daysAgo(7);

  const [clicksByProduct, clicksByPage, biggestDrops, failedJobs] =
    await Promise.all([
      prisma.affiliateClick.groupBy({
        by: ["productId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { productId: "desc" } },
        take: 5,
      }),
      prisma.affiliateClick.groupBy({
        by: ["pageType", "pageSlug"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        orderBy: { _count: { pageSlug: "desc" } },
        take: 5,
      }),
      prisma.priceStats.findMany({
        where: { dropPercentage: { gt: 0 } },
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
    include: { _count: { select: { products: { where: { active: true } } } } },
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

export async function getPriorityBreakdown() {
  const rows = await prisma.product.groupBy({
    by: ["updatePriority"],
    where: { active: true },
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
  const ctr = pageviews > 0 ? Math.round((clicks / pageviews) * 1000) / 10 : null;
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
      status: run.status,
      startedAt: run.startedAt,
      durationMs: run.finishedAt ? run.finishedAt.getTime() - run.startedAt.getTime() : null,
      processed: run.processed,
      errors: run.errors,
    }))
    .sort((a, b) => a.job.localeCompare(b.job));
}

export async function getSeoStatus() {
  const [publishable, rejected, noindexed, opportunities] = await Promise.all([
    prisma.generatedContent.count({ where: { status: "PUBLISHED", noindex: false } }),
    prisma.generatedContent.count({ where: { status: "REJECTED" } }),
    prisma.generatedContent.count({ where: { status: "PUBLISHED", noindex: true } }),
    prisma.searchOpportunity.count({ where: { status: "PENDING" } }),
  ]);
  return { publishable, rejected, noindexed, opportunities };
}

export interface AmazonStatus {
  mode: "mock" | "live";
  tagConfigured: boolean;
  creatorsApiConfigured: boolean;
  policyReviewDate: string;
  policyReviewRecent: boolean;
  compliancePass: boolean;
}

/** Never returns the tag/key/secret values themselves — only booleans
 * (project brief Part W: "Nunca mostrar API key, secret, token"). */
export function getAmazonStatus(): AmazonStatus {
  const checks = checkLiveActivationReadiness();
  return {
    mode: env.AMAZON_PROVIDER,
    tagConfigured: env.AMAZON_ASSOCIATE_TAG.length > 0,
    creatorsApiConfigured: env.AMAZON_CREATORS_API_KEY.length > 0 && env.AMAZON_CREATORS_API_SECRET.length > 0,
    policyReviewDate: env.AMAZON_POLICY_REVIEW_DATE,
    policyReviewRecent: isPolicyReviewRecent(),
    compliancePass: checks.every((c) => c.pass),
  };
}

export async function getPrivacyStatus() {
  const [analyticsGranted, analyticsDenied, marketingGranted, marketingDenied, total] = await Promise.all([
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
