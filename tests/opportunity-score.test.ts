import { describe, expect, it } from "vitest";
import { calculateOpportunityScore } from "@/lib/services/opportunity-score";
import { calculatePriceStats } from "@/lib/services/price-stats";

const now = new Date("2026-08-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number, price: number) {
  return { price, observedAt: new Date(now.getTime() - days * DAY) };
}

describe("calculateOpportunityScore", () => {
  it("scores an excellent, well-reviewed, deeply discounted, in-stock product highly", () => {
    const history = Array.from({ length: 40 }, (_, i) => daysAgo(40 - i, 200));
    const stats = calculatePriceStats(history, 100, now);

    const result = calculateOpportunityScore({
      currentPrice: 100,
      listedDiscountPercentage: 50,
      rating: 4.8,
      reviewCount: 5000,
      availability: "IN_STOCK",
      stats,
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe("Excelente preço");
    expect(result.insufficientHistory).toBe(false);
  });

  it("scores a product priced above its historical average poorly", () => {
    const history = Array.from({ length: 40 }, (_, i) => daysAgo(40 - i, 100));
    const stats = calculatePriceStats(history, 150, now);

    const result = calculateOpportunityScore({
      currentPrice: 150,
      listedDiscountPercentage: 0,
      rating: 3,
      reviewCount: 5,
      availability: "IN_STOCK",
      stats,
    });

    expect(result.score).toBeLessThan(35);
  });

  it("flags insufficient history instead of a false precise label", () => {
    const stats = calculatePriceStats([daysAgo(1, 100)], 100, now);

    const result = calculateOpportunityScore({
      currentPrice: 100,
      availability: "IN_STOCK",
      stats,
    });

    expect(result.insufficientHistory).toBe(true);
    expect(result.label).toBe("Ainda estamos acompanhando este preço.");
  });

  it("penalizes out-of-stock products regardless of price quality", () => {
    const history = Array.from({ length: 40 }, (_, i) => daysAgo(40 - i, 200));
    const stats = calculatePriceStats(history, 100, now);

    const inStock = calculateOpportunityScore({
      currentPrice: 100,
      listedDiscountPercentage: 50,
      availability: "IN_STOCK",
      stats,
    });
    const outOfStock = calculateOpportunityScore({
      currentPrice: 100,
      listedDiscountPercentage: 50,
      availability: "OUT_OF_STOCK",
      stats,
    });

    expect(outOfStock.score).toBeLessThan(inStock.score);
  });

  it("keeps the score within 0-100", () => {
    const stats = calculatePriceStats([daysAgo(5, 10)], 1000, now);
    const result = calculateOpportunityScore({
      currentPrice: 1000,
      listedDiscountPercentage: 0,
      availability: "UNKNOWN",
      stats,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
