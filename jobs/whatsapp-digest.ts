import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { loadWhatsAppTrendingToday } from "@/lib/queries/whatsapp-trending-today";
import { buildWhatsAppItemCaption } from "@/lib/services/whatsapp-message";
import {
  isWhatsAppConfigured,
  sendWhatsAppMessages,
  type WhatsAppOutgoingPost,
} from "@/lib/services/whatsapp-sender";

const DEFAULT_ITEMS_PER_POST = 6;

/**
 * Posts today's real "em alta" products (lib/queries/whatsapp-trending-
 * today.ts) to the WhatsApp Channel once a day — owner's brief,
 * 2026-11-15: "mostrar os produtos em alta todos os dias", linking back
 * to the site itself rather than straight to the merchant. One message
 * per product (owner's brief, 2026-11-16: "quero que as imagens
 * apareçam") — image + caption when the product has a real photo, plain
 * text otherwise, never a placeholder image. dryRun defaults to true,
 * same convention as every other digest job in this codebase.
 *
 * `count` defaults to 6 for the daily automated cron (same "menos
 * volume, mais prova" cadence as the Telegram digest) — the cron never
 * passes a different value. Higher counts are for a manual, one-off
 * "launch batch" run (owner's brief, 2026-11-16: "vamos enviar muitas
 * ofertas boas", channel brand new and nearly empty), never quality: the
 * same title+image+price requirements apply no matter how many are
 * asked for.
 */
export async function runWhatsAppDigestJob(
  dryRun: boolean,
  count: number = DEFAULT_ITEMS_PER_POST,
): Promise<JobCounters> {
  return runJob("WHATSAPP_DIGEST", async (ctx) => {
    const items = await loadWhatsAppTrendingToday(count);
    ctx.counters.processed = items.length;

    if (items.length === 0) {
      logger.info("whatsapp_digest.nothing_to_post", {});
      return;
    }

    const posts: WhatsAppOutgoingPost[] = items.map((item) => ({
      text: buildWhatsAppItemCaption(item, env.NEXT_PUBLIC_SITE_URL),
      imageUrl: item.imageUrl,
    }));

    if (dryRun) {
      for (const post of posts) {
        console.log(
          `--- (dry-run, nada será enviado)${post.imageUrl ? ` [imagem: ${post.imageUrl}]` : " [sem imagem]"} ---\n${post.text}\n`,
        );
      }
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
      await sendWhatsAppMessages(posts);
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
    options: {
      live: { type: "boolean", default: false },
      count: { type: "string" },
    },
  });
  const dryRun = !values.live;
  const count = values.count ? Number(values.count) : DEFAULT_ITEMS_PER_POST;
  if (dryRun) {
    console.log("=== DRY RUN — nada será postado. Passe --live pra enviar. ===");
  }
  runWhatsAppDigestJob(dryRun, count)
    .then((c) => console.log("WHATSAPP_DIGEST done:", JSON.stringify(c)))
    .catch((err) => {
      console.error("WHATSAPP_DIGEST failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
