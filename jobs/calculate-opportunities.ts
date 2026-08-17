import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { calculateOpportunityScore } from "@/lib/services/opportunity-score";
import { detectPriceDrop } from "@/lib/services/price-drop-detector";
import type { PriceStatsResult } from "@/lib/services/price-stats";

function toStatsResult(row: {
  currentPrice: unknown;
  lowestPrice: unknown;
  highestPrice: unknown;
  avg7d: unknown;
  avg30d: unknown;
  avg90d: unknown;
  dropPercentage: number | null;
  distanceFromLow: number | null;
  historicalPosition: number | null;
  dataPointCount: number;
  coverageDays: number;
}): PriceStatsResult {
  return {
    currentPrice: Number(row.currentPrice),
    lowestPrice: Number(row.lowestPrice),
    highestPrice: Number(row.highestPrice),
    avg7d: row.avg7d === null ? null : Number(row.avg7d),
    avg30d: row.avg30d === null ? null : Number(row.avg30d),
    avg90d: row.avg90d === null ? null : Number(row.avg90d),
    dropPercentage: row.dropPercentage,
    distanceFromLow: row.distanceFromLow ?? 0,
    historicalPosition: row.historicalPosition ?? 0,
    dataPointCount: row.dataPointCount,
    coverageDays: row.coverageDays,
  };
}

/**
 * Recomputes OpportunityScore for every active product with PriceStats, and
 * emits PRICE_DROP_DETECTED events (logged into AutomationRun.metadata for
 * now — see project brief section 19; homepage/alerts consume this later).
 * A detected drop also bumps the product to HOT priority so
 * REFRESH_PRIORITY_PRODUCTS keeps a closer eye on it.
 */
export async function calculateOpportunities() {
  return runJob("CALCULATE_OPPORTUNITIES", async (ctx) => {
    const products = await prisma.product.findMany({
      where: { active: true, priceStats: { isNot: null } },
      select: {
        id: true,
        rating: true,
        reviewCount: true,
        priceStats: true,
        offers: { orderBy: { observedAt: "desc" }, take: 1 },
        priceHistory: { orderBy: { observedAt: "desc" }, take: 30 },
      },
    });

    const drops: string[] = [];

    for (const product of products) {
      ctx.counters.processed += 1;
      const offer = product.offers[0];
      const stats = product.priceStats;
      if (!offer || !stats) continue;

      const statsResult = toStatsResult(stats);

      const result = calculateOpportunityScore({
        currentPrice: Number(offer.price),
        listedDiscountPercentage: offer.discountPercentage,
        rating: product.rating,
        reviewCount: product.reviewCount,
        availability: offer.availability,
        stats: statsResult,
      });

      await prisma.opportunityScore.upsert({
        where: { productId: product.id },
        create: {
          productId: product.id,
          score: result.score,
          priceScore: result.priceScore,
          discountScore: result.discountScore,
          popularityScore: result.popularityScore,
          ratingScore: result.ratingScore,
          historicalScore: result.historicalScore,
          confidence: result.confidence,
        },
        update: {
          score: result.score,
          priceScore: result.priceScore,
          discountScore: result.discountScore,
          popularityScore: result.popularityScore,
          ratingScore: result.ratingScore,
          historicalScore: result.historicalScore,
          confidence: result.confidence,
          calculatedAt: new Date(),
        },
      });

      const priorHistory = product.priceHistory.map((h) => ({
        price: Number(h.price),
        observedAt: h.observedAt,
      }));
      const dropEvent = detectPriceDrop(
        product.id,
        priorHistory,
        Number(offer.price),
        statsResult,
      );

      if (dropEvent) {
        drops.push(product.id);
        await prisma.product.update({
          where: { id: product.id },
          data: { updatePriority: "HOT" },
        });
      }

      ctx.counters.updated += 1;
    }

    ctx.metadata.priceDropsDetected = drops.length;
    ctx.metadata.priceDropProductIds = drops;
  });
}
