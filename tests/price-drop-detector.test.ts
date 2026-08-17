import { describe, expect, it } from "vitest";
import { detectPriceDrop } from "@/lib/services/price-drop-detector";
import { calculatePriceStats } from "@/lib/services/price-stats";

const now = new Date("2026-08-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number, price: number) {
  return { price, observedAt: new Date(now.getTime() - days * DAY) };
}

describe("detectPriceDrop", () => {
  it("returns null when there is no prior history", () => {
    const event = detectPriceDrop(
      "p1",
      [],
      100,
      calculatePriceStats([], 100, now),
      now,
    );
    expect(event).toBeNull();
  });

  it("returns null when the price did not drop", () => {
    const history = [daysAgo(5, 100)];
    const stats = calculatePriceStats(history, 100, now);
    const event = detectPriceDrop("p1", history, 110, stats, now);
    expect(event).toBeNull();
  });

  it("detects a significant percentage drop", () => {
    const history = [daysAgo(5, 100)];
    const stats = calculatePriceStats(history, 80, now);
    const event = detectPriceDrop("p1", history, 80, stats, now);
    expect(event).not.toBeNull();
    expect(event?.reasons).toContain("PERCENTAGE_DROP");
    expect(event?.dropPercentage).toBe(20);
  });

  it("flags a new historical low", () => {
    const history = [daysAgo(20, 100), daysAgo(10, 90), daysAgo(5, 95)];
    const stats = calculatePriceStats(history, 85, now);
    const event = detectPriceDrop("p1", history, 85, stats, now);
    expect(event?.reasons).toContain("NEW_HISTORICAL_LOW");
  });

  it("does not fire for a negligible drop that stays within the established range", () => {
    const history = [daysAgo(30, 80), daysAgo(20, 85), daysAgo(10, 100)];
    const stats = calculatePriceStats(history, 99.5, now);
    const event = detectPriceDrop("p1", history, 99.5, stats, now);
    expect(event).toBeNull();
  });

  it("flags an unusually large drop relative to typical volatility", () => {
    const history = [
      daysAgo(30, 100),
      daysAgo(25, 101),
      daysAgo(20, 99),
      daysAgo(15, 100),
      daysAgo(10, 100),
    ];
    const stats = calculatePriceStats(history, 50, now);
    const event = detectPriceDrop("p1", history, 50, stats, now);
    expect(event?.reasons).toContain("UNUSUAL_DROP");
  });
});
