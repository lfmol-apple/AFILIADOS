import { prisma } from "@/lib/db";

/**
 * Real GET /trends/{site} observations, persisted over time (owner's
 * authorization, 2026-11-19, section 3) — previously "collected for
 * observability only, never persisted" (MercadoLivreTrendsDemandSource's
 * own doc comment), a real signal that was being discarded every cycle.
 * jobs/vitrine-discovery.ts calls persistTrendObservations() on every
 * real Trends API pull; this file only classifies what has ALREADY been
 * observed — it never backfills or assumes history that wasn't actually
 * collected. On day 1, every keyword reports "new" by construction —
 * there is nothing dishonest about that, it's the real state of a
 * brand-new history table.
 */

export type KeywordTrendDirection = "rising" | "falling" | "stable" | "new";

export interface KeywordTrendClassification {
  keyword: string;
  direction: KeywordTrendDirection;
  rankLatest: number;
  rankPrevious: number | null;
  observationCount: number;
  firstObservedAt: Date;
  lastObservedAt: Date;
}

const STABLE_THRESHOLD = 5;

export async function persistTrendObservations(
  observations: Array<{ keyword: string; rank: number; categoryId?: string }>,
): Promise<void> {
  if (observations.length === 0) return;
  await prisma.trendKeywordObservation.createMany({
    data: observations.map((o) => ({ keyword: o.keyword, rank: o.rank, categoryId: o.categoryId })),
  });
}

/**
 * Classifies a keyword's trend from its OWN real observation history —
 * "termos que permanecem em alta... começam a ganhar relevância...
 * estão perdendo relevância" (owner's section 3). Compares the latest
 * observation against the oldest one within the last 21 days (three real
 * weekly pulls, since Mercado Livre's trends list itself only updates
 * weekly) — never against a sample outside that real window.
 */
export async function classifyKeywordTrend(keyword: string): Promise<KeywordTrendClassification | null> {
  const since = new Date(Date.now() - 21 * 86_400_000);
  const observations = await prisma.trendKeywordObservation.findMany({
    where: { keyword, observedAt: { gte: since } },
    orderBy: { observedAt: "asc" },
  });
  if (observations.length === 0) return null;

  const latest = observations[observations.length - 1]!;
  const earliest = observations[0]!;
  const rankPrevious = observations.length > 1 ? earliest.rank : null;

  let direction: KeywordTrendDirection = "new";
  if (rankPrevious !== null) {
    const delta = rankPrevious - latest.rank; // positive = rank number went down = improved (more relevant)
    direction = delta > STABLE_THRESHOLD ? "rising" : delta < -STABLE_THRESHOLD ? "falling" : "stable";
  }

  return {
    keyword,
    direction,
    rankLatest: latest.rank,
    rankPrevious,
    observationCount: observations.length,
    firstObservedAt: earliest.observedAt,
    lastObservedAt: latest.observedAt,
  };
}
