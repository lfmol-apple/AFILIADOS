import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";

/**
 * Automação Operacional V1 (2026-09-08) — the automated counterpart of
 * scripts/ml-enrich-offers.ts. Same real API calls and persistence
 * (lib/services/ml-enrichment-collector.ts, shared with the manual
 * script), operating on whatever catalog products ML_DEMAND has already
 * persisted (mercado_livre_highlights/mercado_livre_trends signals) — no
 * separate category config needed here, it follows demand.
 *
 * Partial-failure isolation: the original script processed catalog
 * products in a single loop with no per-product try/catch — one product
 * throwing (a transient network error, an unexpected 5xx) would abort
 * enrichment for every product after it in the list, silently losing real
 * data that was otherwise reachable. Fixed here: each catalog product is
 * isolated, retried (withRetry) for transient errors, and counted as an
 * error (not a crash) on failure — the run still reports PARTIAL with
 * everything else it did succeed at, never FAILED-and-nothing-persisted
 * just because product #3 of 20 had a bad moment.
 */
export async function runMlEnrichmentJob(): Promise<JobCounters> {
  return runJob(
    "ML_ENRICHMENT",
    async (ctx) => {
      if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
        throw new Error(
          "ML_ENRICHMENT requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED. See docs/AUTOMATION.md.",
        );
      }

      const provider = await createMercadoLivreProvider();
      const merchant = await prisma.merchant.upsert({
        where: { code: "MERCADO_LIVRE" },
        create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
        update: {},
      });

      const catalogListings = await prisma.merchantListing.findMany({
        where: {
          merchantId: merchant.id,
          signals: { some: { source: { in: ["mercado_livre_highlights", "mercado_livre_trends"] } } },
        },
        include: { monetizationScore: true },
      });

      ctx.metadata.catalogProductsFound = catalogListings.length;
      const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
      const results: Record<string, unknown> = {};

      for (const catalogListing of catalogListings) {
        try {
          const catalogDemandScore = catalogListing.monetizationScore?.score ?? 50;
          const result = await withRetry(
            () =>
              enrichCatalogListing(
                provider,
                merchant.id,
                catalogListing,
                catalogDemandScore,
                sellerCache,
              ),
            { label: `ml_enrichment.${catalogListing.externalId}` },
          );

          if (!result) {
            // 404 on the catalog product itself — not an error, nothing
            // to enrich yet (matches the manual script's "pulando").
            ctx.counters.processed += 1;
            results[catalogListing.externalId] = { skipped: "not_found" };
            continue;
          }

          ctx.counters.processed += result.offersProcessed;
          ctx.counters.created += result.offersCreated;
          ctx.counters.updated += result.offersUpdated;
          results[catalogListing.externalId] = result;
        } catch (err) {
          logger.error("ml_enrichment.product_failed", {
            externalId: catalogListing.externalId,
            message: String(err),
          });
          ctx.counters.errors += 1;
          results[catalogListing.externalId] = { error: String(err) };
        }
      }

      ctx.metadata.products = results;
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMlEnrichmentJob()
    .then((counters) => {
      console.log("ML_ENRICHMENT done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("ML_ENRICHMENT failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
