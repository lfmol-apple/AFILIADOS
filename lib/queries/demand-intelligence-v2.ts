import { prisma } from "@/lib/db";
import {
  calculateDemandIntelligenceV2,
  type DemandIntelligenceResult,
  type DemandRankObservation,
} from "@/lib/services/demand-intelligence-v2";

export interface DemandIntelligenceProductRow extends DemandIntelligenceResult {
  merchantListingId: string;
  canonicalProductId: string | null;
  merchant: "MERCADO_LIVRE";
  title: string;
  imageUrl: string | null;
  externalId: string;
  latestSource: string | null;
  v1Position: number | null;
  v2Position: number | null;
}

export interface DemandIntelligenceComparison {
  sharedTop50: number;
  promotedByV2: DemandIntelligenceProductRow[];
  demotedByV2: DemandIntelligenceProductRow[];
  weakOneShotRankOnes: DemandIntelligenceProductRow[];
  persistentLowerRanks: DemandIntelligenceProductRow[];
  accelerating: DemandIntelligenceProductRow[];
  losingStrength: DemandIntelligenceProductRow[];
}

export interface DemandIntelligenceAudit {
  rankedSignals: number;
  rankedListings: number;
  mlRankedSignals: number;
  shopeeRankedSignals: number;
  affiliateClicks: {
    total: number;
    withMerchant: number;
    withMerchantListing: number;
    withCanonicalProduct: number;
    withLegacyProduct: number;
  };
  internalSignals: {
    pageViews: number;
    searches: number;
  };
}

export interface DemandIntelligenceSnapshot {
  generatedAt: Date;
  elapsedMs: number;
  candidateListings: number;
  hydratedListings: number;
  historySignalsLoaded: number;
  topByDemandScoreV2: DemandIntelligenceProductRow[];
  topByCurrentSignalV1: DemandIntelligenceProductRow[];
  comparison: DemandIntelligenceComparison;
  audit: DemandIntelligenceAudit;
}

function rankFromSignal(signal: {
  bestsellerRank: number | null;
  trendRank: number | null;
}): number | null {
  return signal.bestsellerRank ?? signal.trendRank ?? null;
}

function titleFromListing(listing: {
  externalId: string;
  canonicalProduct: { title: string; imageUrl: string | null } | null;
  signals: Array<{ raw: unknown }>;
}): { title: string; imageUrl: string | null } {
  const latestRaw = listing.signals[0]?.raw as
    | { productName?: string; title?: string; imageUrl?: string }
    | null
    | undefined;
  return {
    title:
      listing.canonicalProduct?.title ??
      latestRaw?.productName ??
      latestRaw?.title ??
      listing.externalId,
    imageUrl: listing.canonicalProduct?.imageUrl ?? latestRaw?.imageUrl ?? null,
  };
}

function withPositions(rows: DemandIntelligenceProductRow[]) {
  return rows.map((row, index) => ({ ...row, v2Position: index + 1 }));
}

function buildComparison(input: {
  byV2: DemandIntelligenceProductRow[];
  byV1: DemandIntelligenceProductRow[];
}): DemandIntelligenceComparison {
  const v1PositionById = new Map(
    input.byV1.map((row, index) => [row.merchantListingId, index + 1]),
  );
  const top50V1 = new Set(input.byV1.slice(0, 50).map((row) => row.merchantListingId));
  const top50V2 = new Set(input.byV2.slice(0, 50).map((row) => row.merchantListingId));
  const withBothPositions = input.byV2.map((row, index) => ({
    ...row,
    v2Position: index + 1,
    v1Position: v1PositionById.get(row.merchantListingId) ?? null,
  }));

  const sharedTop50 = [...top50V2].filter((id) => top50V1.has(id)).length;
  const promotedByV2 = withBothPositions
    .filter((row) => row.v1Position === null || row.v1Position - (row.v2Position ?? 0) >= 10)
    .slice(0, 10);
  const demotedByV2 = input.byV1
    .map((row, index) => ({
      ...row,
      v1Position: index + 1,
      v2Position: withBothPositions.find((candidate) => candidate.merchantListingId === row.merchantListingId)?.v2Position ?? null,
    }))
    .filter((row) => row.v2Position === null || (row.v2Position ?? 0) - (row.v1Position ?? 0) >= 10)
    .slice(0, 10);

  return {
    sharedTop50,
    promotedByV2,
    demotedByV2,
    weakOneShotRankOnes: withBothPositions
      .filter((row) => row.currentRank === 1 && row.confidence === "LOW")
      .slice(0, 10),
    persistentLowerRanks: withBothPositions
      .filter(
        (row) =>
          (row.currentRank ?? 99) > 5 &&
          row.top10Share >= 0.7 &&
          row.rankedCycles >= 6,
      )
      .slice(0, 10),
    accelerating: withBothPositions
      .filter((row) => row.demandMomentum === "ACCELERATING")
      .slice(0, 10),
    losingStrength: withBothPositions
      .filter((row) => row.demandMomentum === "DECELERATING")
      .slice(0, 10),
  };
}

async function getDemandIntelligenceAudit(): Promise<DemandIntelligenceAudit> {
  const rankWhere = {
    OR: [{ bestsellerRank: { not: null } }, { trendRank: { not: null } }],
  };
  const rankedSignals = await prisma.merchantListingSignal.count({
    where: rankWhere,
  });
  const rankedListings = await prisma.merchantListingSignal
    .groupBy({ by: ["merchantListingId"], where: rankWhere })
    .then((rows) => rows.length);
  const mlRankedSignals = await prisma.merchantListingSignal.count({
    where: {
      ...rankWhere,
      merchantListing: { merchant: { code: "MERCADO_LIVRE" } },
    },
  });
  const shopeeRankedSignals = await prisma.merchantListingSignal.count({
    where: {
      ...rankWhere,
      merchantListing: { merchant: { code: "SHOPEE" } },
    },
  });
  const affiliateClicksTotal = await prisma.affiliateClick.count();
  const affiliateClicksWithMerchant = await prisma.affiliateClick.count({
    where: { merchantId: { not: null } },
  });
  const affiliateClicksWithMerchantListing = await prisma.affiliateClick.count({
    where: { merchantListingId: { not: null } },
  });
  const affiliateClicksWithCanonicalProduct = await prisma.affiliateClick.count({
    where: { canonicalProductId: { not: null } },
  });
  const affiliateClicksWithLegacyProduct = await prisma.affiliateClick.count({
    where: { productId: { not: null } },
  });
  const pageViews = await prisma.pageView.count();
  const searches = await prisma.searchEvent.count();

  return {
    rankedSignals,
    rankedListings,
    mlRankedSignals,
    shopeeRankedSignals,
    affiliateClicks: {
      total: affiliateClicksTotal,
      withMerchant: affiliateClicksWithMerchant,
      withMerchantListing: affiliateClicksWithMerchantListing,
      withCanonicalProduct: affiliateClicksWithCanonicalProduct,
      withLegacyProduct: affiliateClicksWithLegacyProduct,
    },
    internalSignals: { pageViews, searches },
  };
}

export async function getDemandIntelligenceSnapshot(input: {
  limit?: number;
  candidateLimit?: number;
  historySignalsPerListing?: number;
} = {}): Promise<DemandIntelligenceSnapshot> {
  const startedAt = Date.now();
  const limit = input.limit ?? 50;
  const candidateLimit = input.candidateLimit ?? 600;
  const historySignalsPerListing = input.historySignalsPerListing ?? 40;
  const now = new Date();

  const candidateGroups = await prisma.merchantListingSignal.groupBy({
    by: ["merchantListingId"],
    where: {
      OR: [{ bestsellerRank: { not: null } }, { trendRank: { not: null } }],
      merchantListing: {
        active: true,
        merchant: { code: "MERCADO_LIVRE" },
        signals: { none: { source: "mercado_livre_catalog_items" } },
      },
    },
    _max: { observedAt: true },
    orderBy: { _max: { observedAt: "desc" } },
    take: candidateLimit,
  });
  const candidateIds = candidateGroups.map((group) => group.merchantListingId);

  const listings = candidateIds.length
    ? await prisma.merchantListing.findMany({
        where: { id: { in: candidateIds } },
        include: {
          merchant: { select: { code: true } },
          canonicalProduct: { select: { title: true, imageUrl: true } },
          signals: {
            where: {
              OR: [{ bestsellerRank: { not: null } }, { trendRank: { not: null } }],
            },
            orderBy: { observedAt: "desc" },
            take: historySignalsPerListing,
          },
        },
      })
    : [];
  const audit = await getDemandIntelligenceAudit();

  const rows = listings
    .filter((listing) => listing.merchant.code === "MERCADO_LIVRE")
    .map((listing): DemandIntelligenceProductRow => {
      const observations: DemandRankObservation[] = [...listing.signals]
        .reverse()
        .map((signal) => ({
          rank: rankFromSignal(signal),
          observedAt: signal.observedAt,
          source: signal.source,
        }));
      const intelligence = calculateDemandIntelligenceV2(observations, now);
      const title = titleFromListing(listing);
      const latestRankSignal = listing.signals.find((signal) => rankFromSignal(signal) !== null);

      return {
        ...intelligence,
        merchantListingId: listing.id,
        canonicalProductId: listing.canonicalProductId,
        merchant: "MERCADO_LIVRE",
        title: title.title,
        imageUrl: title.imageUrl,
        externalId: listing.externalId,
        latestSource: latestRankSignal?.source ?? null,
        v1Position: null,
        v2Position: null,
      };
    });

  const topByCurrentSignalV1 = rows
    .filter((row) => row.v1CurrentSignal > 0)
    .sort((a, b) => b.v1CurrentSignal - a.v1CurrentSignal || b.demandScoreV2 - a.demandScoreV2)
    .map((row, index) => ({ ...row, v1Position: index + 1 }))
    .slice(0, limit);

  const topByDemandScoreV2 = withPositions(
    [...rows].sort(
      (a, b) =>
        b.demandScoreV2 - a.demandScoreV2 ||
        b.demandPersistence - a.demandPersistence ||
        b.v1CurrentSignal - a.v1CurrentSignal,
    ),
  ).slice(0, limit);

  const comparison = buildComparison({
    byV2: withPositions(
      [...rows].sort(
        (a, b) =>
          b.demandScoreV2 - a.demandScoreV2 ||
          b.demandPersistence - a.demandPersistence ||
          b.v1CurrentSignal - a.v1CurrentSignal,
      ),
    ),
    byV1: rows
      .filter((row) => row.v1CurrentSignal > 0)
      .sort((a, b) => b.v1CurrentSignal - a.v1CurrentSignal || b.demandScoreV2 - a.demandScoreV2),
  });

  return {
    generatedAt: now,
    elapsedMs: Date.now() - startedAt,
    candidateListings: candidateGroups.length,
    hydratedListings: listings.length,
    historySignalsLoaded: listings.reduce((sum, listing) => sum + listing.signals.length, 0),
    topByDemandScoreV2,
    topByCurrentSignalV1,
    comparison,
    audit,
  };
}
