import type { proto } from "baileys";
import { env } from "@/lib/config/env";
import { connectWhatsApp, WhatsAppNotConfiguredError } from "@/lib/services/whatsapp-connection";

export { WhatsAppNotConfiguredError };

export type WhatsAppMessageKey = proto.IMessageKey;

export function isWhatsAppConfigured(): boolean {
  return env.WHATSAPP_GROUP_JID.length > 0;
}

export interface WhatsAppOutgoingPost {
  text: string;
  /** Owner's brief, 2026-11-16: "quero que as imagens apareçam" — when
   * set, posts as an image with this text as the caption instead of a
   * plain text message. */
  imageUrl?: string | null;
}

const BETWEEN_POSTS_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Posts one text message to the configured WhatsApp Group. Connects,
 * sends, disconnects — same one-shot-per-call shape as
 * lib/services/telegram-sender.ts, not a long-lived bot process.
 */
export async function sendWhatsAppMessage(text: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_GROUP_JID is not set.");
  }
  const { sock, close } = await connectWhatsApp();
  try {
    await sock.sendMessage(env.WHATSAPP_GROUP_JID, { text });
  } finally {
    await close();
  }
}

/**
 * Posts several products to the WhatsApp Group in one connection (one
 * message each, image + caption when the product has a real photo) —
 * opening a fresh connection per post would be wasteful for a 5-6 item
 * daily digest. A short delay between posts keeps this looking like a
 * human posting a few updates, not a burst of automated traffic.
 *
 * The Group (not the Channel) is the automated destination — confirmed
 * 2026-11-15 that no automated client can reliably post to a WhatsApp
 * Channel (WHATSAPP_CHANNEL_JID), see that var's comment in
 * lib/config/env.ts.
 */
export async function sendWhatsAppMessages(posts: WhatsAppOutgoingPost[]): Promise<WhatsAppMessageKey[]> {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_GROUP_JID is not set.");
  }
  if (posts.length === 0) return [];

  const keys: WhatsAppMessageKey[] = [];
  const { sock, close } = await connectWhatsApp();
  try {
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]!;
      const sent = post.imageUrl
        ? await sock.sendMessage(env.WHATSAPP_GROUP_JID, {
            image: { url: post.imageUrl },
            caption: post.text,
          })
        : await sock.sendMessage(env.WHATSAPP_GROUP_JID, { text: post.text });
      if (sent?.key) keys.push(sent.key);
      if (i < posts.length - 1) await sleep(BETWEEN_POSTS_DELAY_MS);
    }
  } finally {
    await close();
  }
  return keys;
}

/**
 * Revokes ("apagar para todos") messages the bot account itself sent to
 * the Group — owner's brief, 2026-11-18: delete yesterday's batch right
 * before posting today's, so the Group never shows two days of offers
 * (some already stale) at once. Never used on the Channel-forward
 * packet: those messages are forwarded from the owner's own phone, not
 * sent by this account, so Baileys has no key/permission to revoke them
 * — only the owner can remove those, by hand.
 */
export async function deleteWhatsAppMessages(keys: WhatsAppMessageKey[]): Promise<void> {
  if (keys.length === 0) return;
  const { sock, close } = await connectWhatsApp();
  try {
    for (const key of keys) {
      try {
        await sock.sendMessage(env.WHATSAPP_GROUP_JID, { delete: key });
      } catch {
        // Best-effort — a message already deleted/too old to revoke
        // never blocks today's new batch from going out.
      }
    }
  } finally {
    await close();
  }
}

/**
 * Sends the owner a DM with the day's Channel posts, each one ready to
 * forward by hand with a single tap — the one path that reliably reaches
 * the Channel, since it's the real WhatsApp app doing the actual send,
 * not an automated client. Same connection, same per-post shape as
 * sendWhatsAppMessages; separate function because the destination
 * (WHATSAPP_OWNER_PERSONAL_JID, a DM) and the one-time intro line are
 * different.
 */
export async function sendWhatsAppForwardPacket(posts: WhatsAppOutgoingPost[]): Promise<void> {
  if (env.WHATSAPP_OWNER_PERSONAL_JID.length === 0) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_OWNER_PERSONAL_JID is not set.");
  }
  if (posts.length === 0) return;

  const { sock, close } = await connectWhatsApp();
  try {
    await sock.sendMessage(env.WHATSAPP_OWNER_PERSONAL_JID, {
      text: `📬 Ofertas de hoje pro Canal — encaminhe cada uma (👆 mantenha pressionado → Encaminhar → Mercado Livre, Shopee e Amazon):`,
    });
    await sleep(BETWEEN_POSTS_DELAY_MS);
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]!;
      if (post.imageUrl) {
        await sock.sendMessage(env.WHATSAPP_OWNER_PERSONAL_JID, {
          image: { url: post.imageUrl },
          caption: post.text,
        });
      } else {
        await sock.sendMessage(env.WHATSAPP_OWNER_PERSONAL_JID, { text: post.text });
      }
      if (i < posts.length - 1) await sleep(BETWEEN_POSTS_DELAY_MS);
    }
  } finally {
    await close();
  }
}
