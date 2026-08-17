import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { calculatePriceStats } from "@/lib/services/price-stats";

/** Recomputes PriceStats for every active product from its raw
 * PriceHistory + latest offer. Pure aggregation — see docs/AUTOMATION.md. */
export async function calculatePriceStatsJob() {
  return runJob("CALCULATE_PRICE_STATS", async (ctx) => {
    const products = await prisma.product.findMany({
      where: { active: true },
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
  });
}
