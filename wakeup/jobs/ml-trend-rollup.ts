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
// Found live against a full production-scale snapshot (67k+
// MerchantListing rows, 2026-11-19 isolated-environment test, before this
// job ever ran in production): fetching ALL active ML listings in one
// findMany, each with a filtered nested `signals` selection, overflows
// Postgres' bind-parameter limit — the negation filter on bestsellerRank
// stops Prisma from splitting the batch automatically. Paginating by id
// (BATCH_SIZE at a time) sidesteps the limit regardless of filter shape,
// and is the right fix either way at this table's real size.
const BATCH_SIZE = 500;

export async function runMlTrendRollupJob() {
  return runJob(
    "ML_TREND_ROLLUP",
    async (ctx) => {
      let cursor: string | undefined;
      for (;;) {
        const listings = await prisma.merchantListing.findMany({
          where: {
            active: true,
            merchant: { code: "MERCADO_LIVRE" },
            signals: { some: { bestsellerRank: { not: null } } },
          },
          select: {
            id: true,
            signals: {
              where: { bestsellerRank: { not: null } },
              select: { bestsellerRank: true, observedAt: true },
              orderBy: { observedAt: "desc" },
              take: 200, // generous — a few samples/day over 90d is well under this
            },
          },
          orderBy: { id: "asc" },
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        });
        if (listings.length === 0) break;

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

        cursor = listings[listings.length - 1]!.id;
        if (listings.length < BATCH_SIZE) break;
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
