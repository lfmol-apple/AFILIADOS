import { describe, expect, it, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { runFullCycle } from "@/jobs/run";

/**
 * Proves the fix for project brief Sprint 5 section 7: two overlapping
 * `npm run jobs:run` cron invocations must not run concurrently. Reuses
 * runJob()'s existing per-job-name lock under the name "JOBS_CYCLE" (see
 * jobs/run.ts) rather than adding a second locking mechanism — this test
 * exercises the real full cycle (all 13 jobs, CONTENT_GENERATION=mock,
 * AUTO_PUBLISH=false, so nothing external is called and nothing gets
 * actually published) twice concurrently and asserts the second is
 * rejected while the first is still running.
 */
afterAll(async () => {
  await prisma.automationRun.deleteMany({ where: { job: "JOBS_CYCLE" } });
});

/** Deterministic replacement for a fixed-delay guess — see
 * tests/automation-operational-v1.test.ts's own copy of this helper for the
 * real race (runJob()'s lock check+create isn't atomic) a fixed setTimeout
 * guess was exposed to. */
async function waitForAutomationRunStatus(job: string, status: "RUNNING", timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await prisma.automationRun.findFirst({ where: { job, status }, orderBy: { startedAt: "desc" } });
    if (run) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`Timed out waiting for AutomationRun ${job} to reach ${status}`);
}

describe("JOBS_CYCLE lock", () => {
  it("rejects a second full-cycle run while the first is still in progress", async () => {
    const first = runFullCycle();

    // Give the first cycle's runJob() call time to create its RUNNING row
    // before racing the second — polls the real row instead of guessing a
    // fixed delay (same fix as tests/automation-operational-v1.test.ts's
    // ML_SHOPEE_CYCLE lock test).
    await waitForAutomationRunStatus("JOBS_CYCLE", "RUNNING");

    await expect(runFullCycle()).rejects.toThrow(/already running/);

    await first;
  }, 30000);

  it("a subsequent cycle succeeds once the previous one has finished", async () => {
    await runFullCycle();
    const runs = await prisma.automationRun.findMany({
      where: { job: "JOBS_CYCLE" },
      orderBy: { startedAt: "desc" },
      take: 1,
    });
    expect(runs[0]?.status).not.toBe("RUNNING");
  }, 30000);
});
