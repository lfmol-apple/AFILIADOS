import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheckResult {
  status: HealthStatus;
  checks: {
    database: { status: HealthStatus; detail?: string };
    automation: { status: HealthStatus; detail: string };
  };
  providerMode: "mock" | "live";
  contentGenerationMode: string;
  checkedAt: string;
}

const AUTOMATION_LOOKBACK_HOURS = 24;

/**
 * Server-side health check — no secrets in the response (project brief
 * Part S). Database is a real ping (SELECT 1), not just "did Prisma
 * construct successfully". Automation health is inferred from
 * AutomationRun outcomes in the last 24h, not from any external monitor.
 */
export async function runHealthCheck(): Promise<HealthCheckResult> {
  let databaseStatus: HealthStatus = "healthy";
  let databaseDetail: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    databaseStatus = "unhealthy";
    databaseDetail = "Database unreachable";
  }

  let automationStatus: HealthStatus = "healthy";
  let automationDetail = "No automation runs in the lookback window";

  if (databaseStatus === "healthy") {
    const since = new Date(
      Date.now() - AUTOMATION_LOOKBACK_HOURS * 60 * 60 * 1000,
    );
    const recentRuns = await prisma.automationRun.findMany({
      where: { startedAt: { gte: since } },
      select: { status: true },
    });

    if (recentRuns.length > 0) {
      const failedCount = recentRuns.filter(
        (r) => r.status === "FAILED",
      ).length;
      automationDetail = `${failedCount}/${recentRuns.length} runs failed in the last ${AUTOMATION_LOOKBACK_HOURS}h`;
      if (failedCount === recentRuns.length) {
        automationStatus = "unhealthy";
      } else if (failedCount > 0) {
        automationStatus = "degraded";
      }
    }
  } else {
    automationStatus = "unhealthy";
    automationDetail = "Skipped — database unreachable";
  }

  const statuses = [databaseStatus, automationStatus];
  const status: HealthStatus = statuses.includes("unhealthy")
    ? "unhealthy"
    : statuses.includes("degraded")
      ? "degraded"
      : "healthy";

  return {
    status,
    checks: {
      database: { status: databaseStatus, detail: databaseDetail },
      automation: { status: automationStatus, detail: automationDetail },
    },
    providerMode: env.AMAZON_PROVIDER,
    contentGenerationMode: env.CONTENT_GENERATION,
    checkedAt: new Date().toISOString(),
  };
}
