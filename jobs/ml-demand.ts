import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { getValidMercadoLivreAccessToken, createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { MercadoLivreTrendsDemandSource } from "@/lib/demand/sources/mercado-livre-trends-demand-source";
import { MercadoLivreBestsellerDemandSource } from "@/lib/demand/sources/mercado-livre-bestseller-demand-source";
import { ensureMercadoLivreMerchant, persistHighlightSignal } from "@/lib/services/ml-demand-collector";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import { registerCandidate } from "@/lib/services/commercial-intelligence/candidate-registry";
import { pickRotationGroup, ML_GENERAL_SCAN_CATEGORY_GROUPS } from "@/lib/config/ml-demand-categories";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";

/** Owner's correction, 2026-11-22 ("Enriquecimento seletivo, com medição
 * real de custo e chamadas de API"): confirmed live the same day that
 * `enrichCatalogListing` costs 1x GET /products/{id} (detail) + 1x
 * GET /products/{id}/items + 1x GET /users/{seller_id} PER DISTINCT
 * SELLER among that product's offers (deduped across the whole run via
 * `sellerCache`, same pattern jobs/vitrine-discovery.ts already uses) —
 * never free. ML's own highlight endpoint already ranks each category's
 * results by real commercial strength (position 1 = strongest), so only
 * the top N per category per cycle are enriched; a listing already
 * resolved to a CanonicalProduct by any other job costs nothing extra
 * (skipped). This bounds the real API-call growth this change
 * introduces instead of enriching every highlight unconditionally.
 */
const ENRICHMENT_POSITION_CUTOFF = 10;

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
      const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
      const categoryResults: Record<string, unknown> = {};
      let enrichmentAttempts = 0;
      let enrichmentFailures = 0;
      let enrichmentSkippedAlreadyCanonical = 0;
      let enrichmentSkippedBeyondCutoff = 0;

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
              select: { id: true, canonicalProductId: true },
            });
            const listing = await persistHighlightSignal({
              merchantId: merchant.id,
              itemId: h.itemId,
              position: h.position,
              categoryId: category.id,
              discoverySource: "ML_GENERAL",
            });
            // Owner's correction, 2026-11-22 ("Descoberta ampliada,
            // incluindo categorias hoje ausentes"): confirmed live the
            // same day — this job already scans Eletrodomésticos (robôs
            // aspiradores, cafeteiras), Ferramentas, Eletrônicos and
            // Casa/Móveis real categories, but a find here was NEVER
            // registered in the CommercialCandidateRegistry, so it was
            // invisible to buildCommercialCandidatePool regardless of how
            // many real matches existed. This is the fix: every real find
            // is registered, same as every other discovery mechanism.
            await registerCandidate({
              externalId: h.itemId,
              merchantListingId: listing.id,
              sourceType: "general_market_scan",
              sourceDetail: { categoryId: category.id, categoryName: category.name, position: h.position },
              categoryId: category.id,
            });

            if (existing?.canonicalProductId) {
              enrichmentSkippedAlreadyCanonical += 1;
            } else if (h.position > ENRICHMENT_POSITION_CUTOFF) {
              enrichmentSkippedBeyondCutoff += 1;
            } else {
              enrichmentAttempts += 1;
              try {
                await enrichCatalogListing(provider, merchant.id, listing, 60, sellerCache);
              } catch (err) {
                enrichmentFailures += 1;
                logger.error("ml_demand.enrich_failed", { itemId: h.itemId, categoryId: category.id, message: String(err) });
              }
            }

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
      // Real, measured cost of this change — never an estimate (owner's
      // explicit requirement, 2026-11-22): each enrichment attempt is
      // exactly 2 real ML API calls (product detail + product items)
      // plus 1 per newly-seen seller (deduped via sellerCache across the
      // whole run, so a bestseller category sharing sellers across
      // positions costs less than the naive per-listing count).
      ctx.metadata.enrichment = {
        attempts: enrichmentAttempts,
        failures: enrichmentFailures,
        skippedAlreadyCanonical: enrichmentSkippedAlreadyCanonical,
        skippedBeyondPositionCutoff: enrichmentSkippedBeyondCutoff,
        distinctSellersResolvedThisRun: sellerCache.size,
        estimatedRealApiCalls: enrichmentAttempts * 2 + sellerCache.size,
        positionCutoff: ENRICHMENT_POSITION_CUTOFF,
      };
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
