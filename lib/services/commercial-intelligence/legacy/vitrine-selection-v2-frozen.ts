import { prisma } from "@/lib/db";
import type { MonetizationScoreComponents } from "@/types/monetization";
import {
  getActiveCommercialEvents,
  strongestEventForCategory,
} from "@/lib/services/commercial-calendar-engine";
import { calculateVitrineScoreLegacyV2, type LegacyVitrineScoreResult } from "./vitrine-score-v2-frozen";
import type { TrendDirection } from "@/lib/services/listing-trend";

/**
 * Score v2 (Fase 2, owner's explicit correction 2026-11-19): combines the
 * real MonetizationScore the ML/Shopee discovery jobs already compute with
 * two NEW real dimensions — commercial-calendar seasonality and
 * MerchantListingTrend's rank trend — through lib/services/vitrine-
 * score.ts's configurable weights. The MonetizationScore reuse is a
 * foundation, not the conclusion, per the owner's instruction.
 */

export type LegacyVitrineGroupType = "sazonal" | "recorrente" | "emergente";

function classifyGroup(
  hasSeasonalMatch: boolean,
  trendDirection: TrendDirection | null,
): LegacyVitrineGroupType {
  if (hasSeasonalMatch) return "sazonal";
  if (trendDirection === "rising" || trendDirection === "new") return "emergente";
  return "recorrente";
}

const GROUP_TARGETS: Record<LegacyVitrineGroupType, number> = {
  sazonal: 12,
  recorrente: 12,
  emergente: 6,
};

export interface LegacyVitrineCandidate {
  merchantListingId: string;
  score: number;
  group: LegacyVitrineGroupType;
  reason: string;
  scoreBreakdown: LegacyVitrineScoreResult;
}

/**
 * Selects up to `limit` Mercado Livre listings for the Vitrine Inteligente.
 * Candidates come from EVERY MerchantListing already discovered by the
 * regular ML_DEMAND/ML_ENRICHMENT rotation AND jobs/vitrine-discovery.ts's
 * seasonal-category sweep (brief section 3: the universe is not limited
 * to what the site has published) — this function only ranks what's
 * already in the database; widening what gets INTO the database is
 * vitrine-discovery.ts's job, run on a schedule, not something this
 * selection step triggers synchronously.
 */
export async function selectVitrineCandidatesLegacyV2(limit = 30): Promise<LegacyVitrineCandidate[]> {
  const activeEvents = getActiveCommercialEvents();

  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      availability: { not: "OUT_OF_STOCK" },
      merchant: { code: "MERCADO_LIVRE" },
      monetizationScore: { score: { not: null } },
      canonicalProduct: { isNot: null },
    },
    select: {
      id: true,
      monetizationScore: { select: { components: true } },
      canonicalProduct: { select: { categoryId: true } },
      trend: { select: { direction: true } },
    },
    orderBy: { monetizationScore: { score: "desc" } },
    take: limit * 6, // oversample — group quotas + renormalized scoring need headroom
  });

  const clickCounts = await prisma.affiliateClick.groupBy({
    by: ["merchantListingId"],
    where: { campaign: "vitrine_dinamica", merchantListingId: { in: listings.map((l) => l.id) } },
    _count: { _all: true },
  });
  const clicksByListing = new Map(clickCounts.map((c) => [c.merchantListingId, c._count._all]));

  const byGroup: Record<LegacyVitrineGroupType, LegacyVitrineCandidate[]> = {
    sazonal: [],
    recorrente: [],
    emergente: [],
  };

  for (const listing of listings) {
    const categoryId = listing.canonicalProduct?.categoryId ?? null;
    const seasonalMatch = strongestEventForCategory(categoryId, activeEvents);
    const trendDirection = (listing.trend?.direction as TrendDirection | undefined) ?? null;
    const group = classifyGroup(seasonalMatch !== null, trendDirection);

    const breakdown = calculateVitrineScoreLegacyV2({
      monetization: (listing.monetizationScore?.components as MonetizationScoreComponents | undefined) ?? null,
      seasonalEvent: seasonalMatch,
      trendDirection,
      vitrineClickCount: clicksByListing.get(listing.id) ?? 0,
    });

    const reason =
      breakdown.reasons[0] ??
      "pontuação de monetização calculada pelo ciclo de descoberta";

    byGroup[group].push({
      merchantListingId: listing.id,
      score: breakdown.score,
      group,
      reason,
      scoreBreakdown: breakdown,
    });
  }

  for (const group of Object.keys(byGroup) as LegacyVitrineGroupType[]) {
    byGroup[group].sort((a, b) => b.score - a.score);
  }

  const selected: LegacyVitrineCandidate[] = [];
  for (const group of Object.keys(GROUP_TARGETS) as LegacyVitrineGroupType[]) {
    selected.push(...byGroup[group].slice(0, GROUP_TARGETS[group]));
  }

  if (selected.length < limit) {
    const chosenIds = new Set(selected.map((s) => s.merchantListingId));
    const leftovers = Object.values(byGroup)
      .flat()
      .filter((c) => !chosenIds.has(c.merchantListingId))
      .sort((a, b) => b.score - a.score);
    selected.push(...leftovers.slice(0, limit - selected.length));
  }

  return selected.sort((a, b) => b.score - a.score).slice(0, limit);
}
