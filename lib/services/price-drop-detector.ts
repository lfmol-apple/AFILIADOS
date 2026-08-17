import type { PricePoint, PriceStatsResult } from "./price-stats";

export type PriceDropReason =
  "PERCENTAGE_DROP" | "NEW_HISTORICAL_LOW" | "BELOW_AVERAGE" | "UNUSUAL_DROP";

export interface PriceDropEvent {
  type: "PRICE_DROP_DETECTED";
  productId: string;
  previousPrice: number;
  currentPrice: number;
  dropPercentage: number;
  reasons: PriceDropReason[];
  detectedAt: Date;
}

const MIN_SIGNIFICANT_DROP_PERCENTAGE = 5;
const UNUSUAL_DROP_STDDEV_MULTIPLIER = 2;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Compares the newest observation against prior history to decide whether a
 * PRICE_DROP_DETECTED event should fire. Pure and side-effect free: callers
 * (jobs) decide what to do with the event (see docs/AUTOMATION.md).
 */
export function detectPriceDrop(
  productId: string,
  history: PricePoint[],
  currentPrice: number,
  stats: PriceStatsResult,
  now: Date = new Date(),
): PriceDropEvent | null {
  if (history.length === 0) return null;

  const sorted = [...history].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const previousPrice = sorted[sorted.length - 1].price;

  if (currentPrice >= previousPrice) return null;

  const dropPercentage = round2(
    ((previousPrice - currentPrice) / previousPrice) * 100,
  );
  const reasons: PriceDropReason[] = [];

  if (dropPercentage >= MIN_SIGNIFICANT_DROP_PERCENTAGE) {
    reasons.push("PERCENTAGE_DROP");
  }

  const priorPrices = sorted.map((p) => p.price);
  const priorLow = Math.min(...priorPrices);
  if (currentPrice < priorLow) {
    reasons.push("NEW_HISTORICAL_LOW");
  }

  const baseline = stats.avg30d ?? stats.avg90d ?? stats.avg7d;
  if (baseline !== null && currentPrice < baseline) {
    reasons.push("BELOW_AVERAGE");
  }

  const mean = priorPrices.reduce((a, b) => a + b, 0) / priorPrices.length;
  const deviation = stdDev(priorPrices, mean);
  if (
    deviation > 0 &&
    previousPrice - currentPrice > deviation * UNUSUAL_DROP_STDDEV_MULTIPLIER
  ) {
    reasons.push("UNUSUAL_DROP");
  }

  if (reasons.length === 0) return null;

  return {
    type: "PRICE_DROP_DETECTED",
    productId,
    previousPrice,
    currentPrice,
    dropPercentage,
    reasons,
    detectedAt: now,
  };
}
