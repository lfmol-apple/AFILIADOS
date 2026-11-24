import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";
import { buildTriggeredEmail } from "@/lib/services/price-alert-email";
import { sendEmail } from "@/lib/services/email-sender";

/**
 * Checks every active, confirmed, not-yet-triggered PriceAlert against the
 * real current price (Amazon's own Product/Offer for productId, or
 * loadMerchantListingFactsByListingId for merchantListingId — the same
 * facts the publication gate and the Telegram digest already trust) and
 * emails whoever's price-target was actually reached. Fires once per
 * alert: triggeredAt is set right after a successful send, so a later run
 * never double-notifies the same person for the same alert.
 *
 * dryRun defaults to true (same convention as jobs/daily-performance-
 * digest.ts and jobs/telegram-digest.ts) — this sends real email to real
 * visitors, not just the owner, so an accidental bare run must never fire
 * anything.
 */
export async function runPriceAlertCheckJob(dryRun: boolean): Promise<JobCounters> {
  return runJob("PRICE_ALERT_CHECK", async (ctx) => {
    const alerts = await prisma.priceAlert.findMany({
      where: { active: true, confirmedAt: { not: null }, triggeredAt: null },
    });
    ctx.counters.processed = alerts.length;

    for (const alert of alerts) {
      try {
        let currentPrice: number | null = null;
        let productTitle = "";
        let productUrl = "";

        if (alert.productId) {
          const product = await prisma.product.findUnique({
            where: { id: alert.productId },
          });
          if (!product || !product.active) continue;
          const offer = await prisma.offer.findFirst({
            where: { productId: alert.productId },
            orderBy: { observedAt: "desc" },
          });
          currentPrice = offer ? Number(offer.price) : null;
          productTitle = product.title;
          productUrl = `${env.NEXT_PUBLIC_SITE_URL}/produto/${product.slug}`;
        } else if (alert.merchantListingId) {
          const facts = await loadMerchantListingFactsByListingId(alert.merchantListingId);
          if (!facts || !facts.active) continue;
          currentPrice = facts.currentPrice;
          productTitle = facts.title;
          const merchantSlug = facts.merchant === "MERCADO_LIVRE" ? "mercado-livre" : "shopee";
          productUrl = `${env.NEXT_PUBLIC_SITE_URL}/go/${merchantSlug}/${encodeURIComponent(facts.externalId)}?pageType=price_alert&source=price_alert`;
        } else {
          continue;
        }

        if (currentPrice === null || currentPrice > Number(alert.targetPrice)) continue;

        const email = buildTriggeredEmail({
          productTitle,
          targetPrice: Number(alert.targetPrice),
          currentPrice,
          productUrl,
        });

        if (dryRun) {
          console.log(
            `--- (dry-run, não marcado como disparado) ---\nPara: ${alert.contact}\n${email.subject}\n${email.text}\n`,
          );
          ctx.counters.updated += 1;
          continue;
        }

        if (!env.RESEND_API_KEY) {
          ctx.counters.errors += 1;
          logger.error("price_alert_check.not_configured", {
            message: "RESEND_API_KEY must be set.",
          });
          break;
        }

        await sendEmail({ to: alert.contact, ...email });
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { triggeredAt: new Date() },
        });
        ctx.counters.updated += 1;
      } catch (err) {
        ctx.counters.errors += 1;
        logger.error("price_alert_check.alert_failed", {
          alertId: alert.id,
          message: String(err),
        });
      }
    }
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const { values } = parseArgs({
    options: { live: { type: "boolean", default: false } },
  });
  const dryRun = !values.live;
  if (dryRun) {
    console.log("=== DRY RUN — nenhum e-mail será enviado. Passe --live pra enviar. ===");
  }
  runPriceAlertCheckJob(dryRun)
    .then((c) => console.log("PRICE_ALERT_CHECK done:", JSON.stringify(c)))
    .catch((err) => {
      console.error("PRICE_ALERT_CHECK failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
