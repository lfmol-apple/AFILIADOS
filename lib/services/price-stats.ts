export interface PricePoint {
  price: number;
  observedAt: Date;
}

export interface PriceStatsResult {
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  avg7d: number | null;
  avg30d: number | null;
  avg90d: number | null;
  /** Positive = price dropped vs. the average of the window used for avg30d
   * (or the oldest available window when less than 30 days of data exist). */
  dropPercentage: number | null;
  /** 0 = at the all-time low, 1 = at the all-time high. */
  distanceFromLow: number;
  /** 0 = cheapest ever observed, 1 = most expensive ever observed. */
  historicalPosition: number;
  dataPointCount: number;
  coverageDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function average(points: PricePoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => acc + p.price, 0);
  return round2(sum / points.length);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function windowed(points: PricePoint[], now: Date, days: number): PricePoint[] {
  const cutoff = now.getTime() - days * DAY_MS;
  return points.filter((p) => p.observedAt.getTime() >= cutoff);
}

/**
 * Computes price statistics from raw observations only. Never backfills or
 * assumes history that wasn't actually collected — a product with 5 days of
 * data reports 5 days of coverage, not an estimated 90-day window
 * (see project brief section 10: never fabricate history).
 */
export function calculatePriceStats(
  history: PricePoint[],
  currentPrice: number,
  now: Date = new Date(),
): PriceStatsResult {
  if (history.length === 0) {
    return {
      currentPrice,
      lowestPrice: currentPrice,
      highestPrice: currentPrice,
      avg7d: null,
      avg30d: null,
      avg90d: null,
      dropPercentage: null,
      distanceFromLow: 0,
      historicalPosition: 0,
      dataPointCount: 0,
      coverageDays: 0,
    };
  }

  const sorted = [...history].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const prices = sorted.map((p) => p.price);
  const lowestPrice = Math.min(...prices, currentPrice);
  const highestPrice = Math.max(...prices, currentPrice);

  const avg7d = average(windowed(sorted, now, 7));
  const avg30d = average(windowed(sorted, now, 30));
  const avg90d = average(windowed(sorted, now, 90));

  const baseline = avg30d ?? avg90d ?? avg7d ?? currentPrice;
  const dropPercentage =
    baseline > 0 ? round2(((baseline - currentPrice) / baseline) * 100) : null;

  const range = highestPrice - lowestPrice;
  const distanceFromLow =
    range > 0 ? round2((currentPrice - lowestPrice) / range) : 0;
  const historicalPosition = distanceFromLow;

  const oldest = sorted[0].observedAt.getTime();
  const coverageDays = Math.max(
    1,
    Math.ceil((now.getTime() - oldest) / DAY_MS),
  );

  return {
    currentPrice,
    lowestPrice,
    highestPrice,
    avg7d,
    avg30d,
    avg90d,
    dropPercentage,
    distanceFromLow,
    historicalPosition,
    dataPointCount: sorted.length,
    coverageDays,
  };
}
