import { describe, expect, it } from "vitest";
import { calculatePriceStats, type PricePoint } from "@/lib/services/price-stats";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-08-17T12:00:00Z");

function daysAgo(days: number, price: number): PricePoint {
  return { price, observedAt: new Date(now.getTime() - days * DAY) };
}

describe("calculatePriceStats", () => {
  it("returns zeroed-out stats with no history", () => {
    const result = calculatePriceStats([], 100, now);
    expect(result.dataPointCount).toBe(0);
    expect(result.coverageDays).toBe(0);
    expect(result.avg30d).toBeNull();
    expect(result.dropPercentage).toBeNull();
    expect(result.lowestPrice).toBe(100);
    expect(result.highestPrice).toBe(100);
  });

  it("never reports more coverage than actually observed (no fabricated history)", () => {
    const history = [daysAgo(4, 120), daysAgo(2, 110)];
    const result = calculatePriceStats(history, 100, now);
    expect(result.coverageDays).toBeLessThanOrEqual(5);
    expect(result.dataPointCount).toBe(2);
  });

  it("computes lowest/highest across history and current price", () => {
    const history = [daysAgo(10, 150), daysAgo(5, 90)];
    const result = calculatePriceStats(history, 100, now);
    expect(result.lowestPrice).toBe(90);
    expect(result.highestPrice).toBe(150);
  });

  it("computes a positive dropPercentage when current price is below baseline", () => {
    const history = [daysAgo(20, 200), daysAgo(10, 200), daysAgo(1, 200)];
    const result = calculatePriceStats(history, 100, now);
    expect(result.avg30d).toBe(200);
    expect(result.dropPercentage).toBeGreaterThan(0);
  });

  it("places distanceFromLow at 0 when current price is the all-time low", () => {
    const history = [daysAgo(10, 150), daysAgo(5, 120)];
    const result = calculatePriceStats(history, 100, now);
    expect(result.distanceFromLow).toBe(0);
  });

  it("places distanceFromLow at 1 when current price is the all-time high", () => {
    const history = [daysAgo(10, 80), daysAgo(5, 90)];
    const result = calculatePriceStats(history, 100, now);
    expect(result.distanceFromLow).toBe(1);
  });

  it("only includes points within each averaging window", () => {
    const history = [daysAgo(60, 300), daysAgo(3, 100)];
    const result = calculatePriceStats(history, 100, now);
    expect(result.avg7d).toBe(100);
    expect(result.avg90d).toBe(200);
  });
});
