import "dotenv/config";
import { JOBS, type JobName } from "./index";
import { runJob } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";

const ALL_JOBS_IN_ORDER: JobName[] = [
  "DISCOVER_PRODUCTS",
  "REFRESH_PRIORITY_PRODUCTS",
  "REFRESH_CATALOG",
  "CALCULATE_PRICE_STATS",
  "CALCULATE_OPPORTUNITIES",
  "REBALANCE_PRODUCT_PRIORITIES",
  "DISCOVER_CONTENT_OPPORTUNITIES",
  "GENERATE_CONTENT",
  "VALIDATE_CONTENT",
  "PUBLISH_CONTENT",
  "REFRESH_SITEMAPS",
  "MARK_STALE_CONTENT",
  "CLEANUP",
];

/**
 * Runs the full daily cycle under a single "JOBS_CYCLE" AutomationRun lock
 * — reuses runJob()'s existing locking/stale-recovery instead of adding a
 * second locking mechanism, so two `npm run jobs:run` cron invocations
 * that overlap (a slow run still going when the next cron tick fires)
 * can't interleave. Each individual job inside the cycle still gets its
 * own AutomationRun row exactly as before; this just wraps the whole
 * sequence in one more.
 */
export async function runFullCycle(): Promise<void> {
  await runJob("JOBS_CYCLE", async (ctx) => {
    for (const name of ALL_JOBS_IN_ORDER) {
      logger.info("jobs.step_start", { job: name });
      try {
        const counters = await JOBS[name]();
        logger.info("jobs.step_done", { job: name, ...counters });
        ctx.counters.processed += counters.processed;
        ctx.counters.created += counters.created;
        ctx.counters.updated += counters.updated;
      } catch (err) {
        logger.error("jobs.step_failed", { job: name, message: String(err) });
        ctx.counters.errors += 1;
        process.exitCode = 1;
      }
    }
  });
}

async function runSingleJob(name: string): Promise<void> {
  const job = JOBS[name as JobName];
  if (!job) {
    console.error(
      `Unknown job: ${name}. Known jobs: ${Object.keys(JOBS).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }
  logger.info("jobs.step_start", { job: name });
  try {
    const counters = await job();
    logger.info("jobs.step_done", { job: name, ...counters });
  } catch (err) {
    logger.error("jobs.step_failed", { job: name, message: String(err) });
    process.exitCode = 1;
  }
}

async function main() {
  const arg = process.argv[2];

  if (arg === undefined || arg === "ALL") {
    try {
      await runFullCycle();
    } catch (err) {
      // Most likely another cycle is already RUNNING (lock held) — see
      // runJob() in lib/jobs/automation-run.ts. Exit non-zero so cron
      // records the collision instead of silently double-running.
      logger.error("jobs.cycle_aborted", { message: String(err) });
      process.exitCode = 1;
    }
    return;
  }

  await runSingleJob(arg);
}

// Only auto-run when executed directly (`tsx jobs/run.ts`), not when
// runFullCycle is imported for testing (tests/jobs-cycle-lock.test.ts).
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  main().finally(() => process.exit());
}
