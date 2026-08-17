import { prisma } from "@/lib/db";

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
