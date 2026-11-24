import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";

afterEach(async () => {
  await prisma.automationRun.deleteMany({ where: { job: "PRODUCT_MATCHER_SHADOW" } });
  vi.unstubAllGlobals();
  vi.resetModules();
});

/** Deterministic replacement for a fixed-delay guess — see
 * tests/automation-operational-v1.test.ts's own copy of this helper for the
 * real race (runJob()'s lock check+create isn't atomic) a fixed setTimeout
 * guess was exposed to; this is the exact race behind this file's earlier
 * transient failure under parallel execution. */
async function waitForAutomationRunStatus(job: string, status: "RUNNING", timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const run = await prisma.automationRun.findFirst({ where: { job, status }, orderBy: { startedAt: "desc" } });
    if (run) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error(`Timed out waiting for AutomationRun ${job} to reach ${status}`);
}

describe("PRODUCT_MATCHER_SHADOW job", () => {
  it("records a real AutomationRun with the shadow orchestrator's real counters, on a genuinely empty/no-op run", async () => {
    const { runProductMatcherShadowJob } = await import("@/jobs/product-matcher-shadow");
    const counters = await runProductMatcherShadowJob();
    expect(counters.errors).toBe(0);

    const run = await prisma.automationRun.findFirst({
      where: { job: "PRODUCT_MATCHER_SHADOW" },
      orderBy: { startedAt: "desc" },
    });
    expect(run?.status).toBe("SUCCESS");
    expect(run?.finishedAt).not.toBeNull();
    const metadata = run?.metadata as Record<string, unknown> | null;
    expect(metadata).toHaveProperty("candidatePairsConsidered");
    expect(metadata).toHaveProperty("crossMerchant");
  });

  it("a thrown error from the orchestrator is recorded as FAILED, never silently swallowed, and never calls the network (this job has none)", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    vi.doMock("@/lib/services/product-match-shadow", () => ({
      runProductMatcherShadow: vi.fn().mockRejectedValue(new Error("simulated matcher bug")),
    }));
    const { runProductMatcherShadowJob } = await import("@/jobs/product-matcher-shadow");

    await expect(runProductMatcherShadowJob()).rejects.toThrow(/simulated matcher bug/);

    const run = await prisma.automationRun.findFirst({
      where: { job: "PRODUCT_MATCHER_SHADOW" },
      orderBy: { startedAt: "desc" },
    });
    expect(run?.status).toBe("FAILED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a second run while the first is still in progress — same locking every other job reuses", async () => {
    // Real root cause fixed (2026-11-23, found running the FULL suite —
    // never reproduced running this file alone): a fixed 200ms mocked
    // delay is not a safe margin under full-suite system load — the
    // second call's own findFirst+create round trip can take longer
    // than that, so by the time it runs the first job has already
    // finished and released the lock, and the second call legitimately
    // succeeds instead of rejecting. A manually-released gate has no
    // such timing assumption.
    let release: (value: Record<string, number>) => void = () => {};
    const gate = new Promise<Record<string, number>>((resolve) => {
      release = resolve;
    });
    vi.doMock("@/lib/services/product-match-shadow", () => ({
      runProductMatcherShadow: vi.fn(() => gate),
    }));
    const { runProductMatcherShadowJob } = await import("@/jobs/product-matcher-shadow");

    const first = runProductMatcherShadowJob();
    await waitForAutomationRunStatus("PRODUCT_MATCHER_SHADOW", "RUNNING");
    await expect(runProductMatcherShadowJob()).rejects.toThrow(/already running/);
    release({
      eligibleListings: 0,
      eligibleMlRepresentatives: 0,
      eligibleShopeeListings: 0,
      candidatePairsConsidered: 0,
      evidenceProduced: 0,
      confirmed: 0,
      candidate: 0,
      crossMerchant: 0,
      intraMerchant: 0,
      noMatch: 0,
    });
    await first;
  }, 15000);
});
