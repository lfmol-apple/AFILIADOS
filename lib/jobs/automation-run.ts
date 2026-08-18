import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { MarketplaceCode } from "@/types/marketplace";

export interface JobCounters {
  processed: number;
  created: number;
  updated: number;
  errors: number;
}

export interface JobContext {
  counters: JobCounters;
  metadata: Record<string, unknown>;
}

export type JobFn = (ctx: JobContext) => Promise<void>;

/** A RUNNING row older than this is assumed dead (crashed process, killed
 * container) rather than genuinely still working — it's marked FAILED and
 * a new run is allowed to start (project brief Part T: "timeout" +
 * "stale lock recovery"). Chosen well above any single job's realistic
 * duration; if a job legitimately needs longer, raise this rather than
 * remove the safety net. */
const STALE_LOCK_TIMEOUT_MINUTES = 60;

/**
 * Wraps a job body with an AutomationRun row so every automation is
 * observable (project brief section 17: idempotent, observable, recoverable
 * after failure). A lock on `job` prevents two runs of the same job
 * overlapping (section 17: protected against undue concurrent execution),
 * with automatic recovery from a stale lock left behind by a crashed run.
 */
export interface RunJobOptions {
  /** Tags the AutomationRun with which marketplace it processed — populates
   * the AutomationRun.marketplace column that already existed but went
   * unused before this sprint. Omit for jobs that aren't scoped to one
   * marketplace (content validation/publish, cleanup, sitemap refresh). */
  marketplace?: MarketplaceCode;
}

export async function runJob(
  jobName: string,
  fn: JobFn,
  options?: RunJobOptions,
): Promise<JobCounters> {
  const alreadyRunning = await prisma.automationRun.findFirst({
    where: { job: jobName, status: "RUNNING" },
    orderBy: { startedAt: "desc" },
  });

  if (alreadyRunning) {
    const ageMinutes =
      (Date.now() - alreadyRunning.startedAt.getTime()) / (1000 * 60);
    if (ageMinutes < STALE_LOCK_TIMEOUT_MINUTES) {
      throw new Error(
        `Job ${jobName} is already running (AutomationRun ${alreadyRunning.id}, started ${alreadyRunning.startedAt.toISOString()})`,
      );
    }
    // Stale lock: the process that owned it is gone. Recover instead of
    // blocking this job forever.
    await prisma.automationRun.update({
      where: { id: alreadyRunning.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        metadata: {
          ...(alreadyRunning.metadata as Record<string, unknown> | null),
          staleLockRecovered: true,
        },
      },
    });
  }

  const run = await prisma.automationRun.create({
    data: {
      job: jobName,
      status: "RUNNING",
      marketplace: options?.marketplace,
    },
  });

  const ctx: JobContext = {
    counters: { processed: 0, created: 0, updated: 0, errors: 0 },
    metadata: {},
  };

  try {
    await fn(ctx);
    const status = ctx.counters.errors > 0 ? "PARTIAL" : "SUCCESS";
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        processed: ctx.counters.processed,
        created: ctx.counters.created,
        updated: ctx.counters.updated,
        errors: ctx.counters.errors,
        metadata: ctx.metadata as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        processed: ctx.counters.processed,
        created: ctx.counters.created,
        updated: ctx.counters.updated,
        errors: ctx.counters.errors + 1,
        metadata: {
          ...ctx.metadata,
          error: String(err),
        } as Prisma.InputJsonValue,
      },
    });
    throw err;
  }

  return ctx.counters;
}

/** Sums counters from running the same job across multiple marketplaces
 * (project brief Sprint 4 section 6: `for marketplace in
 * getEnabledMarketplaces()`) into the single JobCounters shape the
 * jobs/index.ts registry expects. Each marketplace still gets its own
 * AutomationRun row via its own runJob() call — this only merges the
 * return value for the CLI/registry caller. */
export function mergeJobCounters(counters: JobCounters[]): JobCounters {
  return counters.reduce(
    (acc, c) => ({
      processed: acc.processed + c.processed,
      created: acc.created + c.created,
      updated: acc.updated + c.updated,
      errors: acc.errors + c.errors,
    }),
    { processed: 0, created: 0, updated: 0, errors: 0 },
  );
}
