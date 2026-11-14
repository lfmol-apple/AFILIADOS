import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";

/**
 * Owner's call, 2026-11-14: the ~52k ML catalog listings discovered before
 * ML_ENRICHMENT/ML_DEMAND were removed (see jobs/ml-refresh-linked.ts) have
 * never been enriched — zero MerchantListingSignal rows, no title/image in
 * CanonicalProduct. They can't go into the Amazon-match queue
 * (getNextAmazonMatchBatch requires a title) or get a real ML affiliate
 * link read-and-pasted without one.
 *
 * This job gives them real title/brand/model/image via the exact same
 * enrichCatalogListing() call ML_REFRESH_LINKED already makes — no sales
 * or rating (confirmed unavailable via this API, see that provider
 * method's own doc comment), which is fine: this phase only needs enough
 * identity to (a) show in the Amazon-match review queue and (b) let a
 * human read the real product from its own productUrl later for linking.
 * Never touches AffiliateLinkRegistry — that stays exclusively
 * human/Linkbuilder (docs/AFFILIATE_LINK_REGISTRY.md).
 *
 * A closed backlog, same principle as ML_REFRESH_LINKED: this job only
 * enriches what's already in MerchantListing, never discovers more.
 */
const BATCH_SIZE = 500;

interface BacklogCandidate {
  id: string;
  externalId: string;
  canonicalProductId: string | null;
}

async function loadUnenrichedBacklog(limit: number): Promise<BacklogCandidate[]> {
  return prisma.$queryRaw<BacklogCandidate[]>`
    SELECT ml.id, ml."externalId", ml."canonicalProductId"
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    LEFT JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id
    WHERE m.code = 'MERCADO_LIVRE'
      AND ml.active = true
      AND alr.id IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
      )
    ORDER BY ml."createdAt" ASC
    LIMIT ${limit}
  `;
}

export async function runMlEnrichBacklogJob(): Promise<JobCounters> {
  return runJob(
    "ML_ENRICH_BACKLOG",
    async (ctx) => {
      if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
        throw new Error(
          "ML_ENRICH_BACKLOG requires MERCADO_LIVRE_ENABLED and MERCADO_LIVRE_API_ENABLED. See docs/AUTOMATION.md.",
        );
      }

      const provider = await createMercadoLivreProvider();
      const merchant = await prisma.merchant.upsert({
        where: { code: "MERCADO_LIVRE" },
        create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
        update: {},
      });

      const candidates = await loadUnenrichedBacklog(BATCH_SIZE);
      ctx.metadata.candidatesFound = candidates.length;

      const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
      let notFound = 0;
      const errors: Record<string, string> = {};

      for (const candidate of candidates) {
        try {
          const result = await withRetry(
            () =>
              enrichCatalogListing(
                provider,
                merchant.id,
                candidate,
                50, // no demand signal yet for backlog items — neutral default
                sellerCache,
              ),
            { label: `ml_enrich_backlog.${candidate.externalId}` },
          );

          if (!result) {
            // 404 — delisted on ML's side, not this job's place to deactivate
            // (LINK_HEALTH_CHECK's job). Just skip, don't count as an error.
            ctx.counters.processed += 1;
            notFound += 1;
            continue;
          }

          ctx.counters.processed += result.offersProcessed;
          ctx.counters.created += result.offersCreated;
          ctx.counters.updated += result.offersUpdated;
        } catch (err) {
          logger.error("ml_enrich_backlog.product_failed", {
            externalId: candidate.externalId,
            message: String(err),
          });
          ctx.counters.errors += 1;
          errors[candidate.externalId] = String(err);
        }
      }

      ctx.metadata.notFound = notFound;
      if (Object.keys(errors).length > 0) ctx.metadata.errors = errors;
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runMlEnrichBacklogJob()
    .then((counters) => {
      console.log("ML_ENRICH_BACKLOG done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("ML_ENRICH_BACKLOG failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
