import { prisma } from "@/lib/db";

export interface InternalMetrics {
  jobFailures24h: number;
  avgJobDurationMs: number | null;
  productsProcessed24h: number;
  contentRejected: number;
  clicks24h: number;
  pageviews24h: number;
  searches24h: number;
  searchOpportunityBacklog: number;
}

/** Internal metrics for the admin dashboard — no external/paid platform
 * involved (project brief Part S), everything derived from our own
 * tables. */
export async function getInternalMetrics(): Promise<InternalMetrics> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [runs, contentRejected, clicks, pageviews, searches, backlog] = await Promise.all([
    prisma.automationRun.findMany({
      where: { startedAt: { gte: since } },
      select: { status: true, startedAt: true, finishedAt: true, processed: true },
    }),
    prisma.generatedContent.count({ where: { status: "REJECTED" } }),
    prisma.affiliateClick.count({ where: { createdAt: { gte: since } } }),
    prisma.pageView.count({ where: { createdAt: { gte: since } } }),
    prisma.searchEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.searchOpportunity.count({ where: { status: "PENDING" } }),
  ]);

  const jobFailures24h = runs.filter((r) => r.status === "FAILED").length;
  const productsProcessed24h = runs.reduce((sum, r) => sum + r.processed, 0);
  const durations = runs
    .filter((r): r is typeof r & { finishedAt: Date } => r.finishedAt !== null)
    .map((r) => r.finishedAt.getTime() - r.startedAt.getTime());
  const avgJobDurationMs =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null;

  return {
    jobFailures24h,
    avgJobDurationMs,
    productsProcessed24h,
    contentRejected,
    clicks24h: clicks,
    pageviews24h: pageviews,
    searches24h: searches,
    searchOpportunityBacklog: backlog,
  };
}
