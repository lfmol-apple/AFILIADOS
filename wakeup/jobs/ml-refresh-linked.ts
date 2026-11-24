import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";

/**
 * Keeps already-linked Mercado Livre catalog products from going stale,
 * without reintroducing ML_DEMAND's unbounded discovery (removed
 * 2026-09-24 — see jobs/run-ml-shopee-cycle.ts — after it filled the DB
 * with ~41k listings that never got an affiliate link).
 *
 * registerPanelPick() already enriches a catalog product once, the moment
 * the owner saves its link (lib/services/ml-panel-register.ts). Nothing
 * ran again after that: with ML_ENRICHMENT gone too, every one of those
 * products kept the price/signal data from the day it was linked,
 * forever. Two real consequences, found 2026-11-10 investigating Search
 * Console: (1) the publication gate's 30-day staleness check
 * (lib/services/publication-gate.ts) permanently fails once that day
 * passes, locking the page noindex even though the listing is live and
 * monetizable; (2) the price shown to a visitor can be weeks stale.
 *
 * Scope is the fix: only ML catalog listings that ALREADY have an ACTIVE
 * AffiliateLinkRegistry row (2,219 on 2026-11-10) — a closed, slow-growing
 * set the owner explicitly chose to carry (via the panel), never a
 * rediscovery of new ones. The batch is the staleset-first slice of that
 * set, sized so a full lap completes well inside the gate's 30-day
 * window at this cron's 4-hour cadence (~900/day => the whole set in
 * under 3 days, even as it grows).
 */
const BATCH_SIZE = 150;

interface StaleCandidate {
  id: string;
  externalId: string;
  canonicalProductId: string | null;
  score: number | null;
}

async function loadStalestLinkedCatalogListings(limit: number): Promise<StaleCandidate[]> {
  return prisma.$queryRaw<StaleCandidate[]>`
    SELECT ml.id, ml."externalId", ml."canonicalProductId", ms.score
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    JOIN "AffiliateLinkRegistry" alr
      ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    LEFT JOIN "MonetizationScore" ms ON ms."merchantListingId" = ml.id
    LEFT JOIN LATERAL (
      SELECT MAX(s."observedAt") AS last_offer_observed
      FROM "MerchantListingSignal" s
      JOIN "MerchantListing" sibling ON sibling.id = s."merchantListingId"
      WHERE sibling."canonicalProductId" = ml."canonicalProductId"
        AND s.source = 'mercado_livre_catalog_items'
    ) freshest ON true
    WHERE m.code = 'MERCADO_LIVRE' AND ml.active = true
    ORDER BY freshest.last_offer_observed ASC NULLS FIRST
    LIMIT ${limit}
  `;
}

export async function runMlRefreshLinkedJob(): Promise<JobCounters> {
  return runJob(
    "ML_REFRESH_LINKED",
    async (ctx) => {
      if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
        throw new Error(
          "ML_REFRESH_LINKED requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED. See docs/AUTOMATION.md.",
        );
      }

      const provider = await createMercadoLivreProvider();
      const merchant = await prisma.merchant.upsert({
        where: { code: "MERCADO_LIVRE" },
        create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
        update: {},
      });

      const candidates = await loadStalestLinkedCatalogListings(BATCH_SIZE);
      ctx.metadata.candidatesFound = candidates.length;

      const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
      const results: Record<string, unknown> = {};

      for (const candidate of candidates) {
        try {
          const catalogDemandScore = candidate.score ?? 50;
          const result = await withRetry(
            () =>
              enrichCatalogListing(
                provider,
                merchant.id,
                candidate,
                catalogDemandScore,
                sellerCache,
              ),
            { label: `ml_refresh_linked.${candidate.externalId}` },
          );

          if (!result) {
            // 404 on the catalog product — delisted on Mercado Livre's
            // side. Not this job's place to deactivate it (that is
            // LINK_HEALTH_CHECK's job, which calls the real API directly
            // for exactly this); just skip, don't count as an error.
            ctx.counters.processed += 1;
            results[candidate.externalId] = { skipped: "not_found" };
            continue;
          }

          ctx.counters.processed += result.offersProcessed;
          ctx.counters.created += result.offersCreated;
          ctx.counters.updated += result.offersUpdated;
          results[candidate.externalId] = result;
        } catch (err) {
          logger.error("ml_refresh_linked.product_failed", {
            externalId: candidate.externalId,
            message: String(err),
          });
          ctx.counters.errors += 1;
          results[candidate.externalId] = { error: String(err) };
        }
      }

      ctx.metadata.products = results;
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMlRefreshLinkedJob()
    .then((counters) => {
      console.log("ML_REFRESH_LINKED done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("ML_REFRESH_LINKED failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
