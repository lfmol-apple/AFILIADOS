import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { getValidMercadoLivreAccessToken, createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { MercadoLivreTrendsDemandSource } from "@/lib/demand/sources/mercado-livre-trends-demand-source";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";
import { ensureMercadoLivreMerchant, persistHighlightSignal } from "@/lib/services/ml-demand-collector";
import { pickRotationGroup, ML_GENERAL_SCAN_CATEGORY_GROUPS } from "@/lib/config/ml-demand-categories";

/**
 * General Market Scanner V1 (2026-09-08) — extends what was originally
 * Automação Operacional V1's single-category ML_DEMAND into a rotating,
 * multi-category scan. Same real API calls (GET /trends, GET /highlights,
 * GET /products/{id} for title resolution), same persistence
 * (lib/services/ml-demand-collector.ts, shared with the manual script —
 * never a second copy of this logic).
 *
 * Rotation (project brief section 20/21 — call budget, no "scan
 * everything every cycle"): which categories run THIS execution is
 * derived from how many ML_DEMAND runs already happened
 * (`pickRotationGroup(cycleCount)`, lib/config/ml-demand-categories.ts) —
 * a deterministic function of real, already-persisted state
 * (AutomationRun rows), not a random pick or new counter table.
 *
 * What's different from the manual script, and why:
 *  - Uses the auto-refreshing token (ml-token-store.ts) instead of the
 *    static env token for every call, so an unattended run doesn't die
 *    silently once the bootstrap token's ~6h lifetime passes.
 *  - Wrapped in runJob("ML_DEMAND") — gets locking (no overlapping runs)
 *    and AutomationRun observability for free, same mechanism every other
 *    job in this codebase already uses.
 *  - Each category is isolated in its own try/catch: one category failing
 *    (a transient API error surviving retry, an unexpected schema) must
 *    not lose the other categories' real, valid data for this run —
 *    "falha parcial não pode derrubar o ciclo inteiro" (project brief).
 *    A category failure counts toward ctx.counters.errors, which makes
 *    runJob() report the run as PARTIAL rather than SUCCESS or FAILED —
 *    exactly the existing three-state convention, unchanged.
 *  - Never generates or touches an AffiliateLinkRegistry row — demand
 *    collection is deliberately link-free, same as the manual script.
 */
export async function runMlDemandJob(): Promise<JobCounters> {
  return runJob(
    "ML_DEMAND",
    async (ctx) => {
      if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
        // Missing config — explicit failure, no retry (project brief:
        // "explicit-error+no-retry for ... missing-config"). runJob()
        // catches this, records AutomationRun as FAILED with the sanitized
        // message, and rethrows for the caller (the cycle runner) to see.
        throw new Error(
          "ML_DEMAND requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED. See docs/AUTOMATION.md.",
        );
      }

      const merchant = await ensureMercadoLivreMerchant();
      const getAccessToken = () => getValidMercadoLivreAccessToken();

      // Trends are collected for observability only — the manual script
      // never persisted them either (no MerchantListing maps to a bare
      // keyword), so this preserves that exact, already-reviewed scope.
      try {
        const trends = await withRetry(
          () => new MercadoLivreTrendsDemandSource(undefined, getAccessToken).collect(),
          { label: "ml_demand.trends" },
        );
        ctx.metadata.trendsKeywordCount = trends.length;
      } catch (err) {
        logger.error("ml_demand.trends_failed", { message: String(err) });
        ctx.counters.errors += 1;
        ctx.metadata.trendsError = String(err);
      }

      const provider = await createMercadoLivreProvider();
      const categoryResults: Record<string, unknown> = {};

      const priorRuns = await prisma.automationRun.count({ where: { job: "ML_DEMAND" } });
      const categoriesThisCycle = pickRotationGroup(priorRuns);
      ctx.metadata.rotationGroupIndex = priorRuns % ML_GENERAL_SCAN_CATEGORY_GROUPS.length;
      ctx.metadata.categoriesScannedThisCycle = categoriesThisCycle.map((c) => `${c.id} (${c.name})`);

      for (const category of categoriesThisCycle) {
        try {
          const source = new MercadoLivreBestsellerDemandSource(
            category.id,
            (id) => provider.getCatalogProductName(id),
            getAccessToken,
          );
          const highlights = await withRetry(() => source.collectRaw(), {
            label: `ml_demand.highlights.${category.id}`,
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
              categoryId: category.id,
              discoverySource: "ML_GENERAL",
            });
            if (existing) updated++;
            else created++;
          }

          ctx.counters.processed += highlights.length;
          ctx.counters.created += created;
          ctx.counters.updated += updated;
          categoryResults[category.id] = { name: category.name, resolved: highlights.length, created, updated };
        } catch (err) {
          logger.error("ml_demand.category_failed", { categoryId: category.id, message: String(err) });
          ctx.counters.errors += 1;
          categoryResults[category.id] = { name: category.name, error: String(err) };
        }
      }

      ctx.metadata.categories = categoryResults;
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMlDemandJob()
    .then((counters) => {
      console.log("ML_DEMAND done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("ML_DEMAND failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
