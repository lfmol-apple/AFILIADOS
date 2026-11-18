import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import {
  loadWhatsAppTrendingToday,
  markWhatsAppPriceDropShown,
} from "@/lib/queries/whatsapp-trending-today";
import { buildWhatsAppItemCaption } from "@/lib/services/whatsapp-message";
import {
  isWhatsAppConfigured,
  sendWhatsAppForwardPacket,
  sendWhatsAppMessages,
  deleteWhatsAppMessages,
  type WhatsAppOutgoingPost,
} from "@/lib/services/whatsapp-sender";
import { loadLastGroupBatchKeys, saveLastGroupBatchKeys } from "@/lib/services/whatsapp-group-batch-store";

const DEFAULT_ITEMS_PER_POST = 10;

/**
 * Posts today's real "em alta" products (lib/queries/whatsapp-trending-
 * today.ts) once a day, linking straight to the real merchant affiliate
 * URL (owner's brief, 2026-11-17: no mandatory stop on precocaindo.com.br
 * for this channel). One message per product — image + caption when the
 * product has a real photo, plain text otherwise, never a placeholder
 * image. dryRun defaults to true, same convention as every other digest
 * job in this codebase.
 *
 * Two destinations, confirmed 2026-11-15 (see WHATSAPP_CHANNEL_JID's
 * comment in lib/config/env.ts for why both exist):
 *  1. WHATSAPP_GROUP_JID — the real automated send. Always attempted;
 *     its result is this job's success/failure.
 *  2. WHATSAPP_OWNER_PERSONAL_JID — a best-effort DM with the same posts,
 *     ready for the owner to forward by hand into the Channel. Never
 *     flips the job to FAILED on its own.
 *
 * `count` defaults to 10 (owner's brief, 2026-11-18) for the daily
 * automated cron — the cron never passes a different value. Higher
 * counts are for a manual, one-off batch run, never quality: the same
 * title+image+price requirements apply no matter how many are asked for.
 *
 * Before posting the new batch, revokes every message this same job
 * posted to the Group last time (owner's brief, 2026-11-18: "não posso
 * ficar com propaganda de preço desatualizado" — the Group should only
 * ever show one day's offers, not an accumulating pile of stale ones).
 * Only the Group: the Channel-forward DM is never touched here, since
 * those messages get forwarded from the owner's own phone and this
 * account has no key/permission to revoke them — see
 * lib/services/whatsapp-sender.ts's deleteWhatsAppMessages doc comment.
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
      text: buildWhatsAppItemCaption(item),
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
        message: "WHATSAPP_GROUP_JID must be set.",
      });
      return;
    }

    try {
      const previousKeys = loadLastGroupBatchKeys();
      if (previousKeys.length > 0) {
        try {
          await deleteWhatsAppMessages(previousKeys);
        } catch (err) {
          logger.warn("whatsapp_digest.delete_previous_batch_failed", { message: String(err) });
        }
      }
      const newKeys = await sendWhatsAppMessages(posts);
      saveLastGroupBatchKeys(newKeys);
      ctx.counters.created = items.length;
      // Only after a real send — a verified price drop stops being
      // offered to this digest once it's actually been posted, so the
      // same drop doesn't repeat every day it's still active.
      for (const item of items) {
        if (item.price.kind !== "verified_drop" || !item.merchantListingId) continue;
        try {
          await markWhatsAppPriceDropShown(item.merchantListingId);
        } catch (err) {
          logger.warn("whatsapp_digest.mark_shown_failed", {
            merchantListingId: item.merchantListingId,
            message: String(err),
          });
        }
      }
    } catch (err) {
      ctx.counters.errors += 1;
      logger.error("whatsapp_digest.send_failed", { message: String(err) });
    }

    // Best-effort — the Group send above is the job's real success
    // criterion. The Channel forward-packet is a bonus the owner acts on
    // by hand, so a failure here (e.g. WHATSAPP_OWNER_PERSONAL_JID not set
    // yet) must never flip the job to FAILED.
    try {
      await sendWhatsAppForwardPacket(posts);
    } catch (err) {
      logger.warn("whatsapp_digest.forward_packet_skipped", { message: String(err) });
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
