import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { getValidMercadoLivreAccessToken, createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";
import { ensureMercadoLivreMerchant, persistHighlightSignal } from "@/lib/services/ml-demand-collector";
import { getActiveCommercialEvents } from "@/lib/services/commercial-calendar-engine";

/**
 * Vitrine Inteligente Fase 2 — owner's explicit correction, 2026-11-19:
 * selecting only from what ML_DEMAND's regular 3-group rotation (lib/
 * config/ml-demand-categories.ts) already discovered is NOT enough; the
 * Vitrine must search Mercado Livre for products it has never seen before.
 *
 * This job does exactly that, WITHOUT duplicating any discovery logic: it
 * calls the exact same real Highlights API
 * (MercadoLivreBestsellerDemandSource) and the exact same persistence
 * (persistHighlightSignal) jobs/ml-demand.ts already uses — the only
 * difference is WHICH categories it scans and WHEN. Instead of the fixed
 * 3-group rotation, it scans every real category tied to a commercial
 * event currently inside its watch window (commercial-calendar-engine.ts
 * — 60/45/30/15-day lead), even when that category is outside this
 * cycle's regular rotation group. This is how a product that was never
 * cadastrado before gets discovered specifically because it's seasonally
 * relevant right now (brief section 3: "pesquisar... inclusive produtos
 * que nunca foram cadastrados em nosso sistema").
 *
 * discoverySource="VITRINE_SEASONAL" keeps this traceable as separate from
 * the regular rotation in MerchantListingSignal.raw, for audit purposes
 * only — the resulting MerchantListing/MonetizationScore rows are
 * ordinary, reused by every other query exactly like any other listing.
 */
export async function runVitrineDiscoveryJob() {
  return runJob(
    "VITRINE_DISCOVERY",
    async (ctx) => {
      if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
        throw new Error(
          "VITRINE_DISCOVERY requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED.",
        );
      }

      const merchant = await ensureMercadoLivreMerchant();
      const getAccessToken = () => getValidMercadoLivreAccessToken();
      const provider = await createMercadoLivreProvider();

      const activeEvents = getActiveCommercialEvents();
      const categoryIds = new Set<string>();
      for (const active of activeEvents) {
        for (const categoryId of active.event.categoryIds) categoryIds.add(categoryId);
      }
      ctx.metadata.activeEvents = activeEvents.map(
        (a) => `${a.event.name} (${a.stage}, ${a.daysUntilPeak}d)`,
      );
      ctx.metadata.categoriesScanned = [...categoryIds];

      for (const categoryId of categoryIds) {
        try {
          const source = new MercadoLivreBestsellerDemandSource(
            categoryId,
            (id) => provider.getCatalogProductName(id),
            getAccessToken,
          );
          const highlights = await withRetry(() => source.collectRaw(), {
            label: `vitrine_discovery.highlights.${categoryId}`,
          });

          let created = 0;
          let updated = 0;
          for (const h of highlights) {
            const existing = await prisma.merchantListing.findUnique({
              where: {
                merchantId_marketplace_externalId: {
                  merchantId: merchant.id,
                  marketplace: "BR",
                  externalId: h.itemId,
                },
              },
              select: { id: true },
            });
            await persistHighlightSignal({
              merchantId: merchant.id,
              itemId: h.itemId,
              position: h.position,
              categoryId,
              discoverySource: "VITRINE_SEASONAL",
            });
            if (existing) updated++;
            else created++;
          }

          ctx.counters.processed += highlights.length;
          ctx.counters.created += created;
          ctx.counters.updated += updated;
        } catch (err) {
          logger.error("vitrine_discovery.category_failed", {
            categoryId,
            message: String(err),
          });
          ctx.counters.errors += 1;
        }
      }
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runVitrineDiscoveryJob()
    .then((counters) => {
      console.log("VITRINE_DISCOVERY done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("VITRINE_DISCOVERY failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
