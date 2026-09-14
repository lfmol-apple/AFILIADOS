import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { withRetry } from "@/lib/jobs/retry";
import { logger } from "@/lib/observability/logger";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { ShopeeProvider } from "@/lib/providers/shopee-provider";
import type { MercadoLivreProvider } from "@/lib/providers/mercado-livre-provider";
import {
  checkOneMercadoLivreLinkHealth,
  checkOneShopeeLinkHealth,
} from "@/lib/services/link-health-check";

/**
 * Re-validates every ACTIVE AffiliateLinkRegistry (Mercado Livre + Shopee)
 * against each merchant's own real, authorized API — never the affiliate
 * link itself (that would mean automating a browser against a page we
 * don't control). Not part of the automated ML_SHOPEE_CYCLE cron yet —
 * a deliberate, separate decision, same principle as the 13 Amazon jobs
 * not being auto-scheduled by default. Run manually via
 * `npm run jobs:run-link-health -- --dry-run` first (logs only, writes
 * nothing), then without the flag once its output looks right.
 *
 * dryRun defaults to true — writing INVALID/active=false into production
 * must always be an explicit opt-in (--live), never the accidental
 * default of a bare invocation. See link-health-check.ts's own doc
 * comment for the 2026-09-14 incident this replays.
 */
export async function runLinkHealthCheckJob(dryRun: boolean): Promise<JobCounters> {
  return runJob("LINK_HEALTH_CHECK", async (ctx) => {
    const links = await prisma.affiliateLinkRegistry.findMany({
      where: { status: "ACTIVE" },
      include: { merchantListing: { select: { id: true, externalId: true } }, merchant: true },
    });

    let mlProvider: MercadoLivreProvider | null = null;
    let shopeeProvider: ShopeeProvider | null = null;

    for (const link of links) {
      ctx.counters.processed += 1;
      try {
        const result = await withRetry(async () => {
          if (link.merchant.code === "MERCADO_LIVRE") {
            if (!env.MERCADO_LIVRE_ENABLED || !env.MERCADO_LIVRE_API_ENABLED) {
              throw new Error("MERCADO_LIVRE_ENABLED/API_ENABLED required to check ML links.");
            }
            mlProvider ??= await createMercadoLivreProvider();
            return checkOneMercadoLivreLinkHealth(
              mlProvider,
              link.merchantListingId,
              link.merchantListing.externalId,
              dryRun,
            );
          }
          if (link.merchant.code === "SHOPEE") {
            if (!env.SHOPEE_AFFILIATE_ENABLED || !env.SHOPEE_AFFILIATE_API_ENABLED) {
              throw new Error("SHOPEE_AFFILIATE_ENABLED/API_ENABLED required to check Shopee links.");
            }
            shopeeProvider ??= new ShopeeProvider();
            return checkOneShopeeLinkHealth(
              shopeeProvider,
              link.merchantListingId,
              link.merchantListing.externalId,
              dryRun,
            );
          }
          // No other merchant generates a link this way today — never
          // guess a provider/endpoint for it.
          return { outcome: "STILL_VALID" as const };
        }, { label: `link_health_check.${link.merchantListingId}` });

        if (result.outcome === "FLAGGED_INVALID") {
          ctx.counters.updated += 1;
          logger.info(dryRun ? "link_health_check.dry_run_would_flag_invalid" : "link_health_check.flagged_invalid", {
            merchantListingId: link.merchantListingId,
            merchant: link.merchant.code,
            reason: result.reason,
          });
        } else if (result.outcome === "CHECK_FAILED") {
          ctx.counters.errors += 1;
          logger.error("link_health_check.check_failed", {
            merchantListingId: link.merchantListingId,
            merchant: link.merchant.code,
            message: result.message,
          });
        }
      } catch (err) {
        ctx.counters.errors += 1;
        logger.error("link_health_check.link_failed", {
          merchantListingId: link.merchantListingId,
          merchant: link.merchant.code,
          message: String(err),
        });
      }
    }
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const { values } = parseArgs({ options: { live: { type: "boolean", default: false } } });
  const dryRun = !values.live;
  if (dryRun) {
    console.log("=== DRY RUN — nada será escrito. Passe --live pra aplicar de verdade. ===");
  }
  runLinkHealthCheckJob(dryRun)
    .then((counters) => {
      console.log("LINK_HEALTH_CHECK done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("LINK_HEALTH_CHECK failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
