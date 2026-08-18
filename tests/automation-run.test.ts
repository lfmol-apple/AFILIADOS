import { describe, expect, it, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";

const TEST_JOB_PREFIX = "TEST_AUTOMATION_RUN_";

afterEach(async () => {
  await prisma.automationRun.deleteMany({
    where: { job: { startsWith: TEST_JOB_PREFIX } },
  });
});

describe("runJob locking", () => {
  it("blocks a second concurrent run of the same job", async () => {
    const jobName = `${TEST_JOB_PREFIX}CONCURRENT`;
    let releaseFirst: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const firstRun = runJob(jobName, async () => {
      await gate;
    });

    // Let the first run actually create its RUNNING row before racing the second.
    await new Promise((r) => setTimeout(r, 50));

    await expect(runJob(jobName, async () => {})).rejects.toThrow(
      /already running/,
    );

    releaseFirst();
    await firstRun;
  });

  it("recovers a stale lock left behind by a crashed run instead of blocking forever", async () => {
    const jobName = `${TEST_JOB_PREFIX}STALE`;
    const staleStart = new Date(Date.now() - 90 * 60 * 1000); // 90 minutes ago

    const stale = await prisma.automationRun.create({
      data: { job: jobName, status: "RUNNING", startedAt: staleStart },
    });

    const counters = await runJob(jobName, async (ctx) => {
      ctx.counters.processed = 1;
    });
    expect(counters.processed).toBe(1);

    const recovered = await prisma.automationRun.findUnique({
      where: { id: stale.id },
    });
    expect(recovered?.status).toBe("FAILED");
    expect(
      (recovered?.metadata as Record<string, unknown> | null)
        ?.staleLockRecovered,
    ).toBe(true);
  });

  it("allows sequential runs of the same job once the previous one finished", async () => {
    const jobName = `${TEST_JOB_PREFIX}SEQUENTIAL`;
    await runJob(jobName, async () => {});
    await expect(runJob(jobName, async () => {})).resolves.toBeDefined();

    const runs = await prisma.automationRun.findMany({
      where: { job: jobName },
    });
    expect(runs).toHaveLength(2);
    expect(runs.every((r) => r.status === "SUCCESS")).toBe(true);
  });

  it("marks the run FAILED and rethrows when the job body throws", async () => {
    const jobName = `${TEST_JOB_PREFIX}FAILS`;
    await expect(
      runJob(jobName, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    const run = await prisma.automationRun.findFirst({
      where: { job: jobName },
    });
    expect(run?.status).toBe("FAILED");
  });

  it("marks the run PARTIAL when the job body reports errors without throwing", async () => {
    const jobName = `${TEST_JOB_PREFIX}PARTIAL`;
    await runJob(jobName, async (ctx) => {
      ctx.counters.errors = 1;
    });

    const run = await prisma.automationRun.findFirst({
      where: { job: jobName },
    });
    expect(run?.status).toBe("PARTIAL");
  });
});
