import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { calculateTrendRollup } from "@/lib/services/listing-trend";

/**
 * Vitrine Inteligente Fase 2 — rolls up MerchantListingSignal.bestsellerRank
 * history into MerchantListingTrend (24h/7d/30d/90d-aware rising/falling/
 * stable/new classification), mirroring jobs/calculate-price-stats.ts for
 * price. Scoped to Mercado Livre (the Vitrine's own universe); runs after
 * ML_ENRICHMENT in the regular cycle so it always sees the freshest signals.
 */
export async function runMlTrendRollupJob() {
  return runJob(
    "ML_TREND_ROLLUP",
    async (ctx) => {
      const listings = await prisma.merchantListing.findMany({
        where: { active: true, merchant: { code: "MERCADO_LIVRE" } },
        select: {
          id: true,
          signals: {
            where: { bestsellerRank: { not: null } },
            select: { bestsellerRank: true, observedAt: true },
            orderBy: { observedAt: "desc" },
            take: 200, // generous — a few samples/day over 90d is well under this
          },
        },
      });

      for (const listing of listings) {
        ctx.counters.processed += 1;
        if (listing.signals.length === 0) continue;

        const rollup = calculateTrendRollup(
          listing.signals.map((s) => ({
            rank: s.bestsellerRank!,
            observedAt: s.observedAt,
          })),
        );

        await prisma.merchantListingTrend.upsert({
          where: { merchantListingId: listing.id },
          create: { merchantListingId: listing.id, ...rollup, computedAt: new Date() },
          update: { ...rollup, computedAt: new Date() },
        });
        ctx.counters.updated += 1;
      }
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMlTrendRollupJob()
    .then((counters) => {
      console.log("ML_TREND_ROLLUP done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("ML_TREND_ROLLUP failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
