import { describe, expect, it } from "vitest";
import { calculateTrendRollup, type RankPoint } from "@/lib/services/listing-trend";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-19T12:00:00Z");

function daysAgo(days: number, rank: number): RankPoint {
  return { rank, observedAt: new Date(now.getTime() - days * DAY) };
}

describe("calculateTrendRollup", () => {
  it("reports unknown with no history at all", () => {
    const result = calculateTrendRollup([], now);
    expect(result.direction).toBe("unknown");
    expect(result.rankLatest).toBeNull();
  });

  it("reports new when there's a latest rank but no older comparison", () => {
    const result = calculateTrendRollup([daysAgo(0, 10)], now);
    expect(result.direction).toBe("new");
    expect(result.rankLatest).toBe(10);
    expect(result.rank90dAgo).toBeNull();
  });

  it("detects a rising trend (rank number improved — went down)", () => {
    const history = [daysAgo(90, 50), daysAgo(30, 30), daysAgo(0, 5)];
    const result = calculateTrendRollup(history, now);
    expect(result.direction).toBe("rising");
    expect(result.rankLatest).toBe(5);
    expect(result.rank90dAgo).toBe(50);
  });

  it("detects a falling trend (rank number got worse — went up)", () => {
    const history = [daysAgo(90, 5), daysAgo(0, 40)];
    const result = calculateTrendRollup(history, now);
    expect(result.direction).toBe("falling");
  });

  it("never fabricates a direction beyond the real stable threshold", () => {
    // A ±2 position jitter around the same rank is noise, not a trend.
    const history = [daysAgo(90, 10), daysAgo(0, 11)];
    const result = calculateTrendRollup(history, now);
    expect(result.direction).toBe("stable");
  });

  it("prefers the longest real comparison window available", () => {
    // 90d comparison shows a real rise; a shorter 7d-only window would be
    // noisier — this confirms 90d is used when present.
    const history = [daysAgo(90, 60), daysAgo(7, 45), daysAgo(0, 10)];
    const result = calculateTrendRollup(history, now);
    expect(result.rank90dAgo).toBe(60);
    expect(result.direction).toBe("rising");
  });
});
