import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { ShopeeProvider } from "@/lib/providers/shopee-provider";
import { processShopeeOffer } from "@/lib/services/shopee-cycle-collector";
import { pickDemandDrivenTerms } from "@/lib/services/demand-driven-terms";
import { classifyRelevance } from "@/lib/services/shopee-relevance-gate";
import {
  SHOPEE_DEMAND_TERMS_PER_CYCLE,
  SHOPEE_DEMAND_RESULTS_PER_TERM,
} from "@/lib/config/discovery-budget";

/**
 * Demand-Driven Discovery V1 (2026-09-08) — the second, complementary
 * Shopee discovery path alongside SHOPEE_REFRESH's general/undirected
 * one (project brief section 4: "não substituir totalmente por keyword
 * demand-driven... queremos dois caminhos"). Real ML canonical
 * products' brand+model (lib/services/demand-driven-terms.ts) become
 * Shopee keyword searches (`ShopeeProvider.listOffers({keyword})` — same
 * real, already-implemented GraphQL argument confirmed live in the prior
 * diagnostic round), filtered by a deterministic relevance gate
 * (lib/services/shopee-relevance-gate.ts — no LLM) before anything is
 * persisted.
 *
 * Conservative on purpose (project brief section 3, still in force):
 * only RELEVANT results are persisted. IRRELEVANT and UNCERTAIN results
 * are counted for observability but never written to the database —
 * precision over coverage, same principle ProductMatcher already
 * follows. Reuses processShopeeOffer() (shopee-cycle-collector.ts)
 * unchanged for persistence/link generation — same idempotent
 * upsert-by-(merchantId,marketplace,externalId), same fail-closed
 * AffiliateLinkRegistry rule, same sub_id1=precocaindo attribution
 * (tagged here with source="shopee_demand_driven" so a future
 * conversionReport pull can tell this path's revenue apart from
 * SHOPEE_REFRESH's).
 */
export async function runShopeeDemandDrivenJob(): Promise<JobCounters> {
  return runJob(
    "SHOPEE_DEMAND_DRIVEN",
    async (ctx) => {
      if (!env.SHOPEE_AFFILIATE_ENABLED || !env.SHOPEE_AFFILIATE_API_ENABLED) {
        throw new Error(
          "SHOPEE_DEMAND_DRIVEN requires SHOPEE_AFFILIATE_ENABLED and SHOPEE_AFFILIATE_API_ENABLED. See docs/AUTOMATION.md.",
        );
      }

      const terms = await pickDemandDrivenTerms(SHOPEE_DEMAND_TERMS_PER_CYCLE);
      ctx.metadata.termsUsed = terms.map((t) => t.term);

      if (terms.length === 0) {
        // Not an error — just nothing eligible yet (e.g. ML hasn't
        // enriched any brand+model canonical product this cycle).
        ctx.metadata.skipped = "no eligible ML canonical products with brand+model yet";
        return;
      }

      const provider = new ShopeeProvider();
      const merchant = await prisma.merchant.upsert({
        where: { code: "SHOPEE" },
        create: { code: "SHOPEE", name: "Shopee", active: true, affiliateEnabled: true },
        update: { affiliateEnabled: true },
      });

      let relevant = 0;
      let irrelevant = 0;
      let uncertain = 0;
      const termResults: Record<string, unknown> = {};

      for (const { term } of terms) {
        try {
          const offers = await withRetry(
            () => provider.listOffers({ keyword: term, page: 1, limit: SHOPEE_DEMAND_RESULTS_PER_TERM }),
            { label: `shopee_demand_driven.${term}` },
          );

          let termRelevant = 0;
          let termIrrelevant = 0;
          let termUncertain = 0;

          for (const offer of offers) {
            const classification = classifyRelevance(term, offer.productName);
            if (classification.status === "IRRELEVANT") {
              irrelevant++;
              termIrrelevant++;
              continue;
            }
            if (classification.status === "UNCERTAIN") {
              uncertain++;
              termUncertain++;
              continue; // conservative: never persisted, only counted.
            }

            relevant++;
            termRelevant++;
            const result = await withRetry(
              () => processShopeeOffer(provider, merchant.id, offer, "shopee_demand_driven"),
              { label: `shopee_demand_driven.offer.${offer.itemId}` },
            );
            ctx.counters.processed += 1;
            if (result.listingCreated) ctx.counters.created += 1;
            else ctx.counters.updated += 1;
          }

          termResults[term] = {
            resultsFetched: offers.length,
            relevant: termRelevant,
            irrelevant: termIrrelevant,
            uncertain: termUncertain,
          };
        } catch (err) {
          logger.error("shopee_demand_driven.term_failed", { term, message: String(err) });
          ctx.counters.errors += 1;
          termResults[term] = { error: String(err) };
        }
      }

      ctx.metadata.relevant = relevant;
      ctx.metadata.irrelevant = irrelevant;
      ctx.metadata.uncertain = uncertain;
      ctx.metadata.terms = termResults;
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runShopeeDemandDrivenJob()
    .then((counters) => {
      console.log("SHOPEE_DEMAND_DRIVEN done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("SHOPEE_DEMAND_DRIVEN failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
