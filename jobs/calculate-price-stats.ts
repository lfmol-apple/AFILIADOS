import { prisma } from "@/lib/db";
import { runJob, mergeJobCounters, type JobCounters } from "@/lib/jobs/automation-run";
import { calculatePriceStats } from "@/lib/services/price-stats";
import { getEnabledMarketplaces } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

async function calculatePriceStatsForMarketplace(marketplace: MarketplaceCode): Promise<JobCounters> {
  return runJob(
    "CALCULATE_PRICE_STATS",
    async (ctx) => {
      const products = await prisma.product.findMany({
        where: { marketplace, active: true },
        select: {
          id: true,
          priceHistory: { select: { price: true, observedAt: true } },
          offers: {
            orderBy: { observedAt: "desc" },
            take: 1,
            select: { price: true },
          },
        },
      });

      for (const product of products) {
        ctx.counters.processed += 1;
        const currentOffer = product.offers[0];
        if (!currentOffer) continue;

        // PriceStats is 1:1 with Product, and Product is itself
        // marketplace-scoped (a BR listing and a US listing for "the same"
        // item are different Product rows) — so this aggregation can never
        // mix BRL and USD observations, by construction, not by filtering.
        const stats = calculatePriceStats(
          product.priceHistory.map((h) => ({
            price: Number(h.price),
            observedAt: h.observedAt,
          })),
          Number(currentOffer.price),
        );

        await prisma.priceStats.upsert({
          where: { productId: product.id },
          create: {
            productId: product.id,
            currentPrice: stats.currentPrice,
            lowestPrice: stats.lowestPrice,
            highestPrice: stats.highestPrice,
            avg7d: stats.avg7d,
            avg30d: stats.avg30d,
            avg90d: stats.avg90d,
            dropPercentage: stats.dropPercentage,
            distanceFromLow: stats.distanceFromLow,
            historicalPosition: stats.historicalPosition,
            dataPointCount: stats.dataPointCount,
            coverageDays: stats.coverageDays,
          },
          update: {
            currentPrice: stats.currentPrice,
            lowestPrice: stats.lowestPrice,
            highestPrice: stats.highestPrice,
            avg7d: stats.avg7d,
            avg30d: stats.avg30d,
            avg90d: stats.avg90d,
            dropPercentage: stats.dropPercentage,
            distanceFromLow: stats.distanceFromLow,
            historicalPosition: stats.historicalPosition,
            dataPointCount: stats.dataPointCount,
            coverageDays: stats.coverageDays,
            calculatedAt: new Date(),
          },
        });
        ctx.counters.updated += 1;
      }
    },
    { marketplace },
  );
}

/** Recomputes PriceStats for every active product, per enabled marketplace,
 * from its raw PriceHistory + latest offer. Pure aggregation — see
 * docs/AUTOMATION.md. */
export async function calculatePriceStatsJob(): Promise<JobCounters> {
  const results: JobCounters[] = [];
  for (const marketplace of getEnabledMarketplaces()) {
    results.push(await calculatePriceStatsForMarketplace(marketplace));
  }
  return mergeJobCounters(results);
}
