import type { proto } from "baileys";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { connectWhatsApp } from "@/lib/services/whatsapp-connection";
import { harvestGroupMessageText } from "@/lib/services/whatsapp-group-harvest";
import {
  loadSeenHarvestMessageIds,
  markHarvestMessagesSeen,
} from "@/lib/services/whatsapp-harvest-seen-store";

/**
 * WHATSAPP_HARVEST (2026-11-18) — short poll, same connect→do→disconnect
 * shape every other job in this codebase already uses (never a long-lived
 * listener process — ruled out explicitly, see docs/AUTOMATION.md). Runs
 * every few minutes via cron.
 *
 * What it looks at: only messages where BOTH are true —
 *  1. sent by the owner himself (env.WHATSAPP_OWNER_PERSONAL_JID), never
 *     anyone else's — this is a manual-forward pipeline, not a group
 *     listener (owner's brief, 2026-11-18, after the bot number got
 *     removed from a promo group for looking automated: he stays in
 *     those groups on his own phone and forwards what he wants to us).
 *  2. landed in a chat this bot already has a reason to read: the DM with
 *     the owner, or our own Group (env.WHATSAPP_GROUP_JID) — never any
 *     third-party group, since the bot isn't a member of one anymore.
 *
 * A short-lived connect still receives messages that queued while this
 * job wasn't connected (standard offline-message delivery, same
 * mechanism every WhatsApp client relies on) — FLUSH_WAIT_MS just gives
 * that queued burst a moment to arrive via messages.upsert before the
 * connection closes again.
 */
const FLUSH_WAIT_MS = 8_000;

/**
 * Last 8 digits of a JID's numeric part — found live, 2026-11-18: a DM's
 * `remoteJid` can be an anonymous `@lid` (WhatsApp's newer privacy
 * addressing, not a phone number at all), with the real phone-based JID
 * only available as `remoteJidAlt`; and that phone JID itself can differ
 * from a hand-typed one by Brazil's old "extra 9" mobile-number digit
 * (55 31 9 8640571 vs 55 31 99 8640571 — same real number, two JID
 * strings). Comparing the trailing 8 digits sidesteps both: country
 * code, DDD, and the 9-or-not-9 prefix all live before that point for
 * any Brazilian mobile number.
 */
function phoneDigits(jid: string | null | undefined): string | null {
  if (!jid) return null;
  const digits = jid.replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-8) : null;
}

function isOwnerJid(jid: string | null | undefined): boolean {
  const d = phoneDigits(jid);
  const owner = phoneDigits(env.WHATSAPP_OWNER_PERSONAL_JID);
  return d !== null && d === owner;
}

function extractMessageText(message: proto.IMessage | null | undefined): string | null {
  if (!message) return null;
  return (
    message.conversation ??
    message.extendedTextMessage?.text ??
    message.imageMessage?.caption ??
    message.videoMessage?.caption ??
    null
  );
}

/** WhatsApp sends this thumbnail in cleartext inside the message itself
 * (unlike full media, which needs a separate encrypted download) — real
 * bytes WhatsApp's own server fetched when building the link preview, see
 * lib/services/product-image-store.ts's doc comment for why that's a
 * legitimate, non-fabricated product photo source. */
function extractJpegThumbnail(message: proto.IMessage | null | undefined): Uint8Array | null {
  const bytes = message?.extendedTextMessage?.jpegThumbnail ?? message?.imageMessage?.jpegThumbnail;
  return bytes && bytes.length > 0 ? bytes : null;
}

export async function runWhatsAppHarvestJob(): Promise<JobCounters> {
  return runJob("WHATSAPP_HARVEST", async (ctx) => {
    if (env.WHATSAPP_OWNER_PERSONAL_JID.length === 0) {
      throw new Error(
        "WHATSAPP_HARVEST requires WHATSAPP_OWNER_PERSONAL_JID. See docs/AUTOMATION.md.",
      );
    }

    const alreadySeen = loadSeenHarvestMessageIds();
    const newlySeenIds: string[] = [];
    const texts: Array<{ text: string; thumbnail: Uint8Array | null }> = [];

    let shopeeLinked = 0;
    let mlCandidates = 0;
    let amazonActivated = 0;
    let ignored = 0;

    // Registered via onSocketReady, not after connectWhatsApp() returns —
    // see that function's own doc comment on why: baileys emits the
    // queued offline-message backlog during the handshake itself, so a
    // listener attached only after "open" sees nothing.
    const { sock, close } = await connectWhatsApp(30_000, (readySock) => {
      readySock.ev.on("messages.upsert", (upsert) => {
        for (const msg of upsert.messages ?? []) {
          const id = msg.key?.id;
          if (!id || alreadySeen.has(id) || msg.key?.fromMe) continue;

          const remoteJid = msg.key?.remoteJid;
          // remoteJidAlt/participantAlt: baileys' phone-number fallback
          // for an @lid-addressed chat/participant — not in its public
          // key type yet, read defensively.
          const remoteJidAlt = (msg.key as { remoteJidAlt?: string }).remoteJidAlt;
          const inOwnerDm = isOwnerJid(remoteJid) || isOwnerJid(remoteJidAlt);
          const inOwnGroup = remoteJid === env.WHATSAPP_GROUP_JID;
          if (!inOwnerDm && !inOwnGroup) continue;

          if (inOwnGroup) {
            const participant = msg.key?.participant;
            const participantAlt = (msg.key as { participantAlt?: string }).participantAlt;
            if (!isOwnerJid(participant) && !isOwnerJid(participantAlt)) continue;
          }
          // inOwnerDm: any non-fromMe message in our own 1:1 chat with him
          // is, by definition, from him — no separate sender check needed.

          newlySeenIds.push(id);
          const text = extractMessageText(msg.message);
          if (text) texts.push({ text, thumbnail: extractJpegThumbnail(msg.message) });
        }
      });
    });
    try {
      await new Promise((resolve) => setTimeout(resolve, FLUSH_WAIT_MS));

      markHarvestMessagesSeen(newlySeenIds);
      ctx.counters.processed = texts.length;

      for (const { text, thumbnail } of texts) {
        try {
          const result = await harvestGroupMessageText(text, sock, thumbnail);
          shopeeLinked += result.shopeeLinked;
          mlCandidates += result.mlCandidatesCaptured;
          amazonActivated += result.amazonActivated;
          ignored += result.ignored + result.shopeeSkipped + result.amazonSkipped;
          ctx.counters.created += result.shopeeLinked + result.mlCandidatesCaptured + result.amazonActivated;
        } catch (err) {
          ctx.counters.errors += 1;
          logger.error("whatsapp_harvest.text_failed", { message: String(err) });
        }
      }

      // Best-effort reply so the owner knows the forward actually worked —
      // safe here (our own DM with him), unlike anything posted into a
      // third-party group. Reuses this same connection, never opens a
      // second one.
      if (shopeeLinked + mlCandidates + amazonActivated + ignored > 0) {
        const lines = [`🤖 Fila de grupos processada:`];
        if (shopeeLinked > 0) lines.push(`• ${shopeeLinked} Shopee monetizado(s), no site e já postado(s) no grupo`);
        if (mlCandidates > 0) {
          lines.push(`• ${mlCandidates} Mercado Livre achado(s) em /admin/fila-links, falta gerar o link`);
        }
        if (amazonActivated > 0) lines.push(`• ${amazonActivated} Amazon monetizado(s) e já no site (sem foto ainda)`);
        if (ignored > 0) lines.push(`• ${ignored} ignorado(s)/sem dado suficiente (sem link reconhecido, ou sem preço/título real no texto)`);
        try {
          await sock.sendMessage(env.WHATSAPP_OWNER_PERSONAL_JID, { text: lines.join("\n") });
        } catch (err) {
          logger.warn("whatsapp_harvest.ack_failed", { message: String(err) });
        }
      }
    } finally {
      await close();
    }

    ctx.metadata.shopeeLinked = shopeeLinked;
    ctx.metadata.mlCandidates = mlCandidates;
    ctx.metadata.amazonActivated = amazonActivated;
    ctx.metadata.ignored = ignored;
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runWhatsAppHarvestJob()
    .then((c) => console.log("WHATSAPP_HARVEST done:", JSON.stringify(c)))
    .catch((err) => {
      console.error("WHATSAPP_HARVEST failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
