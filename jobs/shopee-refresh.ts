import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { ShopeeProvider, type ShopeeProductOfferNode } from "@/lib/providers/shopee-provider";
import { scoreOffer, processShopeeOffer } from "@/lib/services/shopee-cycle-collector";

/** Same conservative default as scripts/shopee-first-cycle.ts's `--top` —
 * a documented, explicit constant, not a rediscovered "magic 15". Real
 * Shopee catalog today is small (~12 offers total), so this comfortably
 * covers everything eligible without inventing a bigger cap than has ever
 * been exercised for real. */
const DEFAULT_TOP = 15;
const DEFAULT_MIN_SCORE = 0;

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
      const offers = await withRetry(() => provider.listOffers({ page: 1, limit: 50 }), {
        label: "shopee_refresh.list_offers",
      });
      ctx.metadata.offersFetched = offers.length;

      const merchant = await prisma.merchant.upsert({
        where: { code: "SHOPEE" },
        create: { code: "SHOPEE", name: "Shopee", active: true, affiliateEnabled: true },
        update: { affiliateEnabled: true },
      });

      const scored = offers
        .map((offer) => ({ offer, score: scoreOffer(offer) }))
        .filter((x) => (x.score.score ?? 0) >= DEFAULT_MIN_SCORE)
        .sort((a, b) => (b.score.score ?? 0) - (a.score.score ?? 0))
        .slice(0, DEFAULT_TOP);

      let linksGenerated = 0;
      let linksReused = 0;
      const failures: Array<{ itemId: ShopeeProductOfferNode["itemId"]; error: string }> = [];

      for (const { offer } of scored) {
        try {
          const result = await withRetry(
            () => processShopeeOffer(provider, merchant.id, offer, "shopee_refresh"),
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
      console.error("SHOPEE_REFRESH failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
