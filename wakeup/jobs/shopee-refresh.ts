import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import {
  ShopeeProvider,
  type ShopeeProductOfferNode,
} from "@/lib/providers/shopee-provider";
import { processShopeeOffer } from "@/lib/services/shopee-cycle-collector";
import {
  AMS_SORT_MOST_SOLD,
  SWEEP_PAGE_LIMIT,
  planAmsSweep,
  selectExtraCommissionOffers,
} from "@/lib/services/shopee-discovery-sweep";

/**
 * Automação Operacional V1 (2026-09-08) — the automated counterpart of
 * scripts/shopee-first-cycle.ts. Same real API calls (productOfferV2,
 * generateShortLink) and persistence
 * (lib/services/shopee-cycle-collector.ts, shared with the manual
 * script), including real affiliate-link generation — unlike Mercado
 * Livre, Shopee's link generation genuinely is API-driven (no
 * scraping/RPA involved), so this is the one marketplace where the full
 * "discover -> score -> link" cycle can run unattended end to end.
 * sub_id1=precocaindo attribution is preserved unchanged
 * (buildShopeeSubIds, called from processShopeeOffer).
 *
 * Partial-failure isolation: the original script processed offers in a
 * single loop with no per-offer try/catch — one offer's link-generation
 * call failing would abort the rest of the batch. Fixed here: each offer
 * is isolated and retried (withRetry) for transient errors; a failure is
 * counted, not fatal to the run.
 */
export async function runShopeeRefreshJob(): Promise<JobCounters> {
  return runJob(
    "SHOPEE_REFRESH",
    async (ctx) => {
      if (!env.SHOPEE_AFFILIATE_ENABLED || !env.SHOPEE_AFFILIATE_API_ENABLED) {
        throw new Error(
          "SHOPEE_REFRESH requires SHOPEE_AFFILIATE_ENABLED and SHOPEE_AFFILIATE_API_ENABLED. See docs/AUTOMATION.md.",
        );
      }

      const provider = new ShopeeProvider();

      // Discovery (owner's decision 2026-09-24): Shopee's own list of offers
      // with the seller's extra commission, most sold first, a few pages per
      // cycle (rotating, so deeper pages surface as the run count grows).
      // Only offers paying at least AMS_MIN_COMMISSION_BRL per sale, with
      // enough sales and rating, are kept — biggest commission in reais
      // first. A failed page is counted and skipped, never fatal to the run.
      const priorRuns = await prisma.automationRun.count({
        where: { job: "SHOPEE_REFRESH" },
      });
      const pages = planAmsSweep(priorRuns);
      const fetched: ShopeeProductOfferNode[] = [];
      for (const page of pages) {
        try {
          const found = await withRetry(
            () =>
              provider.listOffers({
                sortType: AMS_SORT_MOST_SOLD,
                isAMSOffer: true,
                page,
                limit: SWEEP_PAGE_LIMIT,
              }),
            { label: `shopee_refresh.ams.page${page}` },
          );
          fetched.push(...found);
        } catch (err) {
          logger.error("shopee_refresh.ams_page_failed", {
            page,
            message: String(err),
          });
          ctx.counters.errors += 1;
        }
      }
      ctx.metadata.offersFetched = fetched.length;
      const known = await prisma.merchantListing.findMany({
        where: {
          marketplace: "BR",
          externalId: { in: fetched.map((o) => String(o.itemId)) },
          merchant: { code: "SHOPEE" },
        },
        select: { externalId: true },
      });
      const selected = selectExtraCommissionOffers(
        fetched,
        new Set(known.map((k) => k.externalId)),
      );
      ctx.metadata.amsPages = pages;
      ctx.metadata.amsNew = selected.length;

      const merchant = await prisma.merchant.upsert({
        where: { code: "SHOPEE" },
        create: {
          code: "SHOPEE",
          name: "Shopee",
          active: true,
          affiliateEnabled: true,
        },
        update: { affiliateEnabled: true },
      });

      const scored = selected.map((offer) => ({ offer }));

      let linksGenerated = 0;
      let linksReused = 0;
      const failures: Array<{
        itemId: ShopeeProductOfferNode["itemId"];
        error: string;
      }> = [];

      for (const { offer } of scored) {
        try {
          const result = await withRetry(
            () =>
              processShopeeOffer(
                provider,
                merchant.id,
                offer,
                "shopee_refresh",
              ),
            { label: `shopee_refresh.offer.${offer.itemId}` },
          );
          ctx.counters.processed += 1;
          if (result.listingCreated) ctx.counters.created += 1;
          else ctx.counters.updated += 1;
          if (result.linkGenerated) linksGenerated += 1;
          if (result.linkReused) linksReused += 1;
        } catch (err) {
          logger.error("shopee_refresh.offer_failed", {
            itemId: offer.itemId,
            message: String(err),
          });
          ctx.counters.errors += 1;
          failures.push({ itemId: offer.itemId, error: String(err) });
        }
      }

      ctx.metadata.selected = scored.length;
      ctx.metadata.linksGenerated = linksGenerated;
      ctx.metadata.linksReused = linksReused;
      if (failures.length > 0) ctx.metadata.failures = failures;
    },
    { marketplace: "BR" },
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runShopeeRefreshJob()
    .then((counters) => {
      console.log("SHOPEE_REFRESH done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error(
        "SHOPEE_REFRESH failed:",
        err instanceof Error ? err.message : err,
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
