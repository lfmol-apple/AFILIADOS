import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { logger } from "./logger";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheckResult {
  status: HealthStatus;
  checks: {
    database: { status: HealthStatus; detail?: string };
    migrations: { status: HealthStatus; detail: string };
    automation: { status: HealthStatus; detail: string };
  };
  providerMode: "mock" | "live";
  contentGenerationMode: string;
  checkedAt: string;
}

const AUTOMATION_LOOKBACK_HOURS = 24;

interface MigrationRow {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

/**
 * Cheap migration-state check: a single indexed query against Prisma's own
 * `_prisma_migrations` table, not a `prisma migrate status` subprocess —
 * this endpoint may be polled frequently by an external monitor, and
 * spawning a process per request would be wasteful and slow. Only flags a
 * problem it can actually observe (a migration that never finished, or was
 * rolled back); it does not compare against the migrations folder on disk.
 */
async function checkMigrations(): Promise<{ status: HealthStatus; detail: string }> {
  try {
    const rows = await prisma.$queryRaw<MigrationRow[]>`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY started_at DESC
      LIMIT 1
    `;
    const latest = rows[0];
    if (!latest) return { status: "healthy", detail: "No migrations recorded yet" };
    if (latest.rolled_back_at) {
      return { status: "unhealthy", detail: `Latest migration was rolled back: ${latest.migration_name}` };
    }
    if (!latest.finished_at) {
      return { status: "degraded", detail: `Latest migration never finished: ${latest.migration_name}` };
    }
    return { status: "healthy", detail: `Up to date: ${latest.migration_name}` };
  } catch (err) {
    logger.error("health.migrations_check_failed", { message: String(err) });
    return { status: "degraded", detail: "Could not read migration state" };
  }
}

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
  } catch (err) {
    databaseStatus = "unhealthy";
    databaseDetail = "Database unreachable";
    logger.error("health.database_unreachable", { message: String(err) });
  }

  const migrations =
    databaseStatus === "healthy"
      ? await checkMigrations()
      : { status: "unhealthy" as HealthStatus, detail: "Skipped — database unreachable" };

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

  const statuses = [databaseStatus, migrations.status, automationStatus];
  const status: HealthStatus = statuses.includes("unhealthy")
    ? "unhealthy"
    : statuses.includes("degraded")
      ? "degraded"
      : "healthy";

  return {
    status,
    checks: {
      database: { status: databaseStatus, detail: databaseDetail },
      migrations,
      automation: { status: automationStatus, detail: automationDetail },
    },
    providerMode: env.AMAZON_PROVIDER,
    contentGenerationMode: env.CONTENT_GENERATION,
    checkedAt: new Date().toISOString(),
  };
}
