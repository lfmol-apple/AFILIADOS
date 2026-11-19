/**
 * Pure rank-trend rollup — the same idea as lib/services/price-stats.ts
 * (calculatePriceStats), applied to MerchantListingSignal.bestsellerRank
 * instead of price. Closes the gap the Vitrine audit found: no 24h/7d/30d/
 * 90d trend window existed for ML/Shopee rank signals. Never backfills or
 * assumes a sample that wasn't actually observed — a listing with only 10
 * days of history reports "new" for the 30d/90d comparisons, never a
 * guessed direction.
 */

export interface RankPoint {
  rank: number;
  observedAt: Date;
}

export type TrendDirection = "rising" | "falling" | "stable" | "new" | "unknown";

export interface TrendRollupResult {
  rankLatest: number | null;
  rank7dAgo: number | null;
  rank30dAgo: number | null;
  rank90dAgo: number | null;
  direction: TrendDirection;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The sample closest to (but not after) `now - days`, within a tolerance
 * window — real observation cadence is every few hours, not exact, so this
 * never requires a sample at the EXACT boundary, just the closest one on
 * or before it, within `toleranceDays` of it (otherwise there's no real
 * comparison point and this returns null rather than guessing). */
function sampleNear(
  points: RankPoint[],
  now: Date,
  daysAgo: number,
  toleranceDays: number,
): number | null {
  const target = now.getTime() - daysAgo * DAY_MS;
  const earliestAcceptable = target - toleranceDays * DAY_MS;
  let best: RankPoint | null = null;
  for (const point of points) {
    const t = point.observedAt.getTime();
    if (t > target || t < earliestAcceptable) continue;
    if (!best || t > best.observedAt.getTime()) best = point;
  }
  return best ? best.rank : null;
}

/** A real, meaningful change in rank — small cadence jitter (±1-2
 * positions) never flips the label between runs. */
const STABLE_THRESHOLD = 3;

export function calculateTrendRollup(
  history: RankPoint[],
  now: Date = new Date(),
): TrendRollupResult {
  const sorted = [...history].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const rankLatest = sorted.length > 0 ? sorted[sorted.length - 1]!.rank : null;
  const rank7dAgo = sampleNear(sorted, now, 7, 3);
  const rank30dAgo = sampleNear(sorted, now, 30, 7);
  const rank90dAgo = sampleNear(sorted, now, 90, 14);

  if (rankLatest === null) {
    return { rankLatest, rank7dAgo, rank30dAgo, rank90dAgo, direction: "unknown" };
  }

  // Prefer the longest real comparison available (90d > 30d > 7d) — a
  // listing trending up over 90 days matters more than week-to-week noise.
  const reference = rank90dAgo ?? rank30dAgo ?? rank7dAgo;
  if (reference === null) {
    return { rankLatest, rank7dAgo, rank30dAgo, rank90dAgo, direction: "new" };
  }

  const delta = reference - rankLatest; // positive = rank NUMBER went down = IMPROVED
  const direction: TrendDirection =
    delta > STABLE_THRESHOLD
      ? "rising"
      : delta < -STABLE_THRESHOLD
        ? "falling"
        : "stable";

  return { rankLatest, rank7dAgo, rank30dAgo, rank90dAgo, direction };
}
