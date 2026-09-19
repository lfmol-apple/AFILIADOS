export type DemandMomentum = "ACCELERATING" | "STABLE" | "DECELERATING" | "UNKNOWN";
export type DemandConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface DemandRankObservation {
  rank: number | null;
  observedAt: Date;
  source?: string | null;
}

export interface DemandScoreV2Breakdown {
  currentRank: number;
  persistence: number;
  momentum: number;
  recency: number;
  historyConfidence: number;
}

export interface DemandIntelligenceResult {
  currentRank: number | null;
  bestRank: number | null;
  averageRank: number | null;
  observations: number;
  rankedCycles: number;
  top10Observations: number;
  top10Share: number;
  consecutiveTop10Cycles: number;
  consecutiveRankedCycles: number;
  firstRankedAt: Date | null;
  lastRankedAt: Date | null;
  rankingAgeDays: number | null;
  rankDelta: number | null;
  rankVelocity: number | null;
  demandPersistence: number;
  demandMomentum: DemandMomentum;
  confidence: DemandConfidence;
  demandScoreV2: number;
  v1CurrentSignal: number;
  breakdown: DemandScoreV2Breakdown;
}

export interface SearchConsoleDemandSignalInput {
  source: "GOOGLE_SEARCH_CONSOLE_API";
  canonicalProductId?: string;
  merchantListingId?: string;
  pageUrl: string;
  query?: string;
  date: Date;
  impressions: number;
  clicks: number;
  averagePosition: number | null;
  ctr: number | null;
}

export interface AcquisitionScoreDraftInput {
  marketDemand?: DemandIntelligenceResult;
  searchDemand?: SearchConsoleDemandSignalInput[];
  internalIntent?: unknown;
}

const TOP_RANK_FOR_SCORE = 50;
const TARGET_OBSERVATIONS_FOR_HIGH_CONFIDENCE = 12;
const TARGET_CONSECUTIVE_TOP10 = 6;
const TARGET_AGE_DAYS = 21;
const FRESH_DAYS = 2;
const STALE_DAYS = 30;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, precision: number = 0): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function rankToScore(rank: number | null): number {
  if (rank === null || rank <= 0 || rank > TOP_RANK_FOR_SCORE) return 0;
  return round(100 * (1 - (rank - 1) / (TOP_RANK_FOR_SCORE - 1)));
}

function recencyScore(lastRankedAt: Date | null, now: Date): number {
  if (!lastRankedAt) return 0;
  const ageDays = (now.getTime() - lastRankedAt.getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays <= FRESH_DAYS) return 100;
  if (ageDays >= STALE_DAYS) return 0;
  return round(100 * (1 - (ageDays - FRESH_DAYS) / (STALE_DAYS - FRESH_DAYS)));
}

function consecutiveFromEnd<T>(items: T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (!predicate(items[i]!)) break;
    count += 1;
  }
  return count;
}

function confidenceFromHistory(input: {
  rankedCycles: number;
  rankingAgeDays: number | null;
  recency: number;
}): DemandConfidence {
  if (
    input.rankedCycles >= TARGET_OBSERVATIONS_FOR_HIGH_CONFIDENCE &&
    (input.rankingAgeDays ?? 0) >= 7 &&
    input.recency >= 50
  ) {
    return "HIGH";
  }
  if (input.rankedCycles >= 4 && input.recency >= 35) return "MEDIUM";
  return "LOW";
}

function confidenceScore(confidence: DemandConfidence): number {
  switch (confidence) {
    case "HIGH":
      return 100;
    case "MEDIUM":
      return 60;
    case "LOW":
      return 25;
  }
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateMomentum(ranksAscending: number[]): {
  demandMomentum: DemandMomentum;
  momentumScore: number;
  rankVelocity: number | null;
  rankDelta: number | null;
} {
  if (ranksAscending.length < 2) {
    return {
      demandMomentum: "UNKNOWN",
      momentumScore: 50,
      rankVelocity: null,
      rankDelta: null,
    };
  }

  const firstRank = ranksAscending[0]!;
  const lastRank = ranksAscending[ranksAscending.length - 1]!;
  const rankDelta = lastRank - firstRank;
  const rankVelocity = (firstRank - lastRank) / (ranksAscending.length - 1);

  if (ranksAscending.length < 3) {
    return {
      demandMomentum:
        Math.abs(rankVelocity) < 1
          ? "STABLE"
          : rankVelocity > 0
            ? "ACCELERATING"
            : "DECELERATING",
      momentumScore: clamp(50 + rankVelocity * 4, 0, 100),
      rankVelocity: round(rankVelocity, 2),
      rankDelta,
    };
  }

  const recentWindow = ranksAscending.slice(-Math.min(5, ranksAscending.length));
  const split = Math.max(1, Math.floor(recentWindow.length / 2));
  const earlyAvg = average(recentWindow.slice(0, split))!;
  const lateAvg = average(recentWindow.slice(split))!;
  const improvement = earlyAvg - lateAvg;
  if (Math.abs(improvement) < 2) {
    return {
      demandMomentum: "STABLE",
      momentumScore: 50,
      rankVelocity: round(rankVelocity, 2),
      rankDelta,
    };
  }
  const normalized = improvement / Math.max(1, earlyAvg);
  const score = clamp(50 + normalized * 120, 0, 100);

  let demandMomentum: DemandMomentum = "STABLE";
  if (score >= 60) demandMomentum = "ACCELERATING";
  if (score <= 40) demandMomentum = "DECELERATING";

  return {
    demandMomentum,
    momentumScore: round(score),
    rankVelocity: round(rankVelocity, 2),
    rankDelta,
  };
}

export function calculateDemandIntelligenceV2(
  observations: DemandRankObservation[],
  now: Date = new Date(),
): DemandIntelligenceResult {
  const sorted = [...observations].sort(
    (a, b) => a.observedAt.getTime() - b.observedAt.getTime(),
  );
  const ranked = sorted.filter(
    (observation): observation is DemandRankObservation & { rank: number } =>
      typeof observation.rank === "number" && observation.rank > 0,
  );
  const ranks = ranked.map((observation) => observation.rank);
  const latestCycle = sorted[sorted.length - 1] ?? null;
  const currentRank =
    latestCycle && typeof latestCycle.rank === "number" && latestCycle.rank > 0
      ? latestCycle.rank
      : null;
  const bestRank = ranks.length > 0 ? Math.min(...ranks) : null;
  const averageRank = average(ranks);
  const top10Observations = ranks.filter((rank) => rank <= 10).length;
  const top10Share = ranked.length > 0 ? top10Observations / ranked.length : 0;
  const consecutiveTop10Cycles = consecutiveFromEnd(
    sorted,
    (observation) =>
      typeof observation.rank === "number" &&
      observation.rank > 0 &&
      observation.rank <= 10,
  );
  const consecutiveRankedCycles = consecutiveFromEnd(
    sorted,
    (observation) =>
      typeof observation.rank === "number" && observation.rank > 0,
  );
  const firstRankedAt = ranked[0]?.observedAt ?? null;
  const lastRankedAt = ranked[ranked.length - 1]?.observedAt ?? null;
  const rankingAgeDays =
    firstRankedAt && lastRankedAt
      ? round(
          (lastRankedAt.getTime() - firstRankedAt.getTime()) /
            (24 * 60 * 60 * 1000),
          1,
        )
      : null;

  const currentRankScore = rankToScore(currentRank);
  const observationScore = clamp(
    ranked.length / TARGET_OBSERVATIONS_FOR_HIGH_CONFIDENCE,
    0,
    1,
  );
  const consecutiveTop10Score = clamp(
    consecutiveTop10Cycles / TARGET_CONSECUTIVE_TOP10,
    0,
    1,
  );
  const ageScore = clamp((rankingAgeDays ?? 0) / TARGET_AGE_DAYS, 0, 1);
  const recency = recencyScore(lastRankedAt, now);
  const demandPersistence = round(
    100 *
      (0.25 * observationScore +
        0.35 * top10Share +
        0.25 * consecutiveTop10Score +
        0.15 * ageScore) *
      (0.55 + 0.45 * (recency / 100)),
  );
  const momentum = calculateMomentum(ranks);
  const confidence = confidenceFromHistory({
    rankedCycles: ranked.length,
    rankingAgeDays,
    recency,
  });
  const historyConfidence = confidenceScore(confidence);
  const demandScoreV2 = round(
    0.35 * currentRankScore +
      0.3 * demandPersistence +
      0.2 * momentum.momentumScore +
      0.1 * recency +
      0.05 * historyConfidence,
  );

  return {
    currentRank,
    bestRank,
    averageRank: averageRank === null ? null : round(averageRank, 1),
    observations: sorted.length,
    rankedCycles: ranked.length,
    top10Observations,
    top10Share: round(top10Share, 2),
    consecutiveTop10Cycles,
    consecutiveRankedCycles,
    firstRankedAt,
    lastRankedAt,
    rankingAgeDays,
    rankDelta: momentum.rankDelta,
    rankVelocity: momentum.rankVelocity,
    demandPersistence,
    demandMomentum: momentum.demandMomentum,
    confidence,
    demandScoreV2,
    v1CurrentSignal: currentRankScore,
    breakdown: {
      currentRank: currentRankScore,
      persistence: demandPersistence,
      momentum: momentum.momentumScore,
      recency,
      historyConfidence,
    },
  };
}

export function formatDemandMomentum(momentum: DemandMomentum): string {
  switch (momentum) {
    case "ACCELERATING":
      return "↑";
    case "DECELERATING":
      return "↓";
    case "STABLE":
      return "→";
    case "UNKNOWN":
      return "—";
  }
}
