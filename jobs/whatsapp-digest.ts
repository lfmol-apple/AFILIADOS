import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { loadWhatsAppTrendingToday } from "@/lib/queries/whatsapp-trending-today";
import { buildWhatsAppTrendingMessage } from "@/lib/services/whatsapp-message";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/services/whatsapp-sender";

const ITEMS_PER_POST = 6;

/**
 * Posts today's real "em alta" products (lib/queries/whatsapp-trending-
 * today.ts) to the WhatsApp Channel once a day — owner's brief,
 * 2026-11-15: "mostrar os produtos em alta todos os dias", linking back
 * to the site itself rather than straight to the merchant. dryRun
 * defaults to true, same convention as every other digest job in this
 * codebase.
 */
export async function runWhatsAppDigestJob(dryRun: boolean): Promise<JobCounters> {
  return runJob("WHATSAPP_DIGEST", async (ctx) => {
    const items = await loadWhatsAppTrendingToday(ITEMS_PER_POST);
    ctx.counters.processed = items.length;

    if (items.length === 0) {
      logger.info("whatsapp_digest.nothing_to_post", {});
      return;
    }

    const text = buildWhatsAppTrendingMessage(items, env.NEXT_PUBLIC_SITE_URL);

    if (dryRun) {
      console.log(`--- (dry-run, nada será enviado) ---\n${text}\n`);
      ctx.counters.created = items.length;
      return;
    }

    if (!isWhatsAppConfigured()) {
      ctx.counters.errors += 1;
      logger.error("whatsapp_digest.not_configured", {
        message: "WHATSAPP_CHANNEL_JID must be set.",
      });
      return;
    }

    try {
      await sendWhatsAppMessage(text);
      ctx.counters.created = items.length;
    } catch (err) {
      ctx.counters.errors += 1;
      logger.error("whatsapp_digest.send_failed", { message: String(err) });
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
    console.log("=== DRY RUN — nada será postado. Passe --live pra enviar. ===");
  }
  runWhatsAppDigestJob(dryRun)
    .then((c) => console.log("WHATSAPP_DIGEST done:", JSON.stringify(c)))
    .catch((err) => {
      console.error("WHATSAPP_DIGEST failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
