import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";

afterEach(async () => {
  await prisma.automationRun.deleteMany({ where: { job: "PRODUCT_MATCHER_SHADOW" } });
  vi.unstubAllGlobals();
  vi.resetModules();
});

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
    vi.doMock("@/lib/services/product-match-shadow", () => ({
      runProductMatcherShadow: vi.fn(
        () => new Promise((resolve) => setTimeout(() => resolve({
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
        }), 200)),
      ),
    }));
    const { runProductMatcherShadowJob } = await import("@/jobs/product-matcher-shadow");

    const first = runProductMatcherShadowJob();
    await new Promise((r) => setTimeout(r, 30));
    await expect(runProductMatcherShadowJob()).rejects.toThrow(/already running/);
    await first;
  }, 15000);
});
