import { describe, expect, it } from "vitest";
import {
  planRefresh,
  type RefreshCandidate,
} from "@/lib/services/refresh-planner";

const now = new Date("2026-08-18T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(now.getTime() - days * DAY);
}

describe("planRefresh", () => {
  it("orders HOT before WARM before COLD regardless of staleness", () => {
    const candidates: RefreshCandidate[] = [
      { productId: "cold-1", priority: "COLD", lastRefresh: daysAgo(100) },
      { productId: "hot-1", priority: "HOT", lastRefresh: daysAgo(1) },
      { productId: "warm-1", priority: "WARM", lastRefresh: daysAgo(50) },
    ];
    const result = planRefresh({ candidates, rateBudget: 10, now });
    expect(result.queue).toEqual(["hot-1", "warm-1", "cold-1"]);
  });

  it("orders by staleness (oldest first) within the same tier", () => {
    const candidates: RefreshCandidate[] = [
      { productId: "hot-recent", priority: "HOT", lastRefresh: daysAgo(1) },
      { productId: "hot-stale", priority: "HOT", lastRefresh: daysAgo(5) },
    ];
    const result = planRefresh({ candidates, rateBudget: 10, now });
    expect(result.queue).toEqual(["hot-stale", "hot-recent"]);
  });

  it("never exceeds the rate budget", () => {
    const candidates: RefreshCandidate[] = Array.from(
      { length: 50 },
      (_, i) => ({
        productId: `p${i}`,
        priority: "HOT" as const,
        lastRefresh: daysAgo(i),
      }),
    );
    const result = planRefresh({ candidates, rateBudget: 5, now });
    expect(result.queue).toHaveLength(5);
  });

  it("excludes candidates still in error backoff", () => {
    const candidates: RefreshCandidate[] = [
      { productId: "ok", priority: "HOT", lastRefresh: daysAgo(1) },
      {
        productId: "backing-off",
        priority: "HOT",
        lastRefresh: daysAgo(1),
        errorBackoffUntil: new Date(now.getTime() + 60_000),
      },
    ];
    const result = planRefresh({ candidates, rateBudget: 10, now });
    expect(result.queue).toEqual(["ok"]);
    expect(result.skippedBackoff).toEqual(["backing-off"]);
  });

  it("includes a candidate once its backoff has expired", () => {
    const candidates: RefreshCandidate[] = [
      {
        productId: "recovered",
        priority: "HOT",
        lastRefresh: daysAgo(1),
        errorBackoffUntil: new Date(now.getTime() - 1000),
      },
    ];
    const result = planRefresh({ candidates, rateBudget: 10, now });
    expect(result.queue).toEqual(["recovered"]);
    expect(result.skippedBackoff).toEqual([]);
  });
});
