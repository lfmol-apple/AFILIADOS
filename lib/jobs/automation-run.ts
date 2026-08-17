import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

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

/**
 * Wraps a job body with an AutomationRun row so every automation is
 * observable (project brief section 17: idempotent, observable, recoverable
 * after failure). A lock on `job` prevents two runs of the same job
 * overlapping (section 17: protected against undue concurrent execution).
 */
export async function runJob(jobName: string, fn: JobFn): Promise<JobCounters> {
  const alreadyRunning = await prisma.automationRun.findFirst({
    where: { job: jobName, status: "RUNNING" },
  });
  if (alreadyRunning) {
    throw new Error(
      `Job ${jobName} is already running (AutomationRun ${alreadyRunning.id}, started ${alreadyRunning.startedAt.toISOString()})`,
    );
  }

  const run = await prisma.automationRun.create({
    data: { job: jobName, status: "RUNNING" },
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
