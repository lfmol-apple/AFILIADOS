import "dotenv/config";
import { runJob } from "@/lib/jobs/automation-run";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";
import { runMlDemandJob } from "./ml-demand";
import { runMlEnrichmentJob } from "./ml-enrichment";
import { runShopeeRefreshJob } from "./shopee-refresh";
import { runProductMatcherShadowJob } from "./product-matcher-shadow";

/**
 * Automação Operacional V1 (2026-09-08) — the ML/Shopee counterpart of
 * jobs/run.ts's runFullCycle() for Amazon. Same pattern, reused
 * deliberately rather than reinvented: one outer "ML_SHOPEE_CYCLE"
 * AutomationRun lock (via the same runJob() locking this codebase already
 * has) prevents two cron ticks from overlapping if a run is still going
 * when the next one fires, while each step (ML_DEMAND, ML_ENRICHMENT,
 * SHOPEE_REFRESH) still gets its own AutomationRun row exactly as before.
 *
 * Order matters: ML_ENRICHMENT reads the catalog products ML_DEMAND just
 * persisted (mercado_livre_highlights/trends signals) — running it first
 * would just find nothing new. SHOPEE_REFRESH is independent of both (its
 * own API, own merchant) and runs last only to keep the log/metadata
 * order matching "ML primeiro, Shopee depois" from the project brief —
 * not a real dependency. PRODUCT_MATCHER_SHADOW (2026-09-08) runs last,
 * after every collector — it only reads what they just persisted
 * (MerchantListing/CanonicalProduct/MerchantListingSignal), so it needs
 * the freshest possible data; added to this cycle only after a manual,
 * human-audited shadow run in production came back healthy (0 false
 * CONFIRMED, 0 duplication, 0 public-surface change — see
 * docs/PRODUCT_MATCHER.md).
 *
 * One marketplace's step failing must not stop the others: each step is
 * already wrapped in its own runJob() (own try/catch, own AutomationRun),
 * so a thrown error from one is caught here, counted, and the cycle moves
 * on — never a single marketplace's transient failure losing another
 * marketplace's successful run. This also protects PRODUCT_MATCHER_SHADOW
 * itself: it never writes to MerchantListing/MerchantListingSignal/
 * MonetizationScore, so even if it fails, the real collection this cycle
 * already did stays intact.
 */
export async function runMlShopeeCycle(): Promise<void> {
  await runJob("ML_SHOPEE_CYCLE", async (ctx) => {
    const steps: Array<{ name: string; run: () => Promise<{ processed: number; created: number; updated: number; errors: number }> }> = [
      { name: "ML_DEMAND", run: runMlDemandJob },
      { name: "ML_ENRICHMENT", run: runMlEnrichmentJob },
      { name: "SHOPEE_REFRESH", run: runShopeeRefreshJob },
      { name: "PRODUCT_MATCHER_SHADOW", run: runProductMatcherShadowJob },
    ];

    for (const step of steps) {
      logger.info("ml_shopee_cycle.step_start", { step: step.name });
      try {
        const counters = await step.run();
        logger.info("ml_shopee_cycle.step_done", { step: step.name, ...counters });
        ctx.counters.processed += counters.processed;
        ctx.counters.created += counters.created;
        ctx.counters.updated += counters.updated;
        ctx.counters.errors += counters.errors;
      } catch (err) {
        // The step's own runJob() already recorded this as a FAILED
        // AutomationRun with a sanitized message — this only stops that
        // one step's contribution from crashing the whole cycle.
        logger.error("ml_shopee_cycle.step_failed", { step: step.name, message: String(err) });
        ctx.counters.errors += 1;
      }
    }
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMlShopeeCycle()
    .catch((err) => {
      // Most likely another cycle is already RUNNING (lock held) — same
      // convention as jobs/run.ts's runFullCycle. Exit non-zero so cron
      // records the collision instead of silently double-running.
      logger.error("ml_shopee_cycle.aborted", { message: String(err) });
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect().finally(() => process.exit()));
}
