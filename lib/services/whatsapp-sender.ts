import type { proto, WASocket } from "baileys";
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
 * Runs `fn` against a WhatsApp socket — reuses `existingSock` as-is when
 * given (jobs/whatsapp-service.ts's one long-lived connection, so a daily
 * scheduled send never opens a second socket on top of the same session;
 * see that file's own doc comment on why two concurrent sockets on one
 * session is a real corruption risk, not just a style choice), or opens
 * and closes a fresh one otherwise — unchanged one-shot behavior for
 * anything still calling these functions outside that service.
 */
async function withSocket<T>(
  existingSock: WASocket | undefined,
  fn: (sock: WASocket) => Promise<T>,
): Promise<T> {
  if (existingSock) return fn(existingSock);
  const { sock, close } = await connectWhatsApp();
  try {
    return await fn(sock);
  } finally {
    await close();
  }
}

/**
 * Posts one text message to the configured WhatsApp Group. Connects,
 * sends, disconnects — same one-shot-per-call shape as
 * lib/services/telegram-sender.ts, not a long-lived bot process.
 */
export async function sendWhatsAppMessage(text: string, sockOverride?: WASocket): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_GROUP_JID is not set.");
  }
  await withSocket(sockOverride, (sock) => sock.sendMessage(env.WHATSAPP_GROUP_JID, { text }));
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
export async function sendWhatsAppMessages(
  posts: WhatsAppOutgoingPost[],
  sockOverride?: WASocket,
): Promise<WhatsAppMessageKey[]> {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_GROUP_JID is not set.");
  }
  if (posts.length === 0) return [];

  return withSocket(sockOverride, async (sock) => {
    const keys: WhatsAppMessageKey[] = [];
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
    return keys;
  });
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
export async function deleteWhatsAppMessages(
  keys: WhatsAppMessageKey[],
  sockOverride?: WASocket,
): Promise<void> {
  if (keys.length === 0) return;
  await withSocket(sockOverride, async (sock) => {
    for (const key of keys) {
      try {
        await sock.sendMessage(env.WHATSAPP_GROUP_JID, { delete: key });
      } catch {
        // Best-effort — a message already deleted/too old to revoke
        // never blocks today's new batch from going out.
      }
    }
  });
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
export async function sendWhatsAppForwardPacket(
  posts: WhatsAppOutgoingPost[],
  sockOverride?: WASocket,
): Promise<void> {
  if (env.WHATSAPP_OWNER_PERSONAL_JID.length === 0) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_OWNER_PERSONAL_JID is not set.");
  }
  if (posts.length === 0) return;

  await withSocket(sockOverride, async (sock) => {
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
  });
}
