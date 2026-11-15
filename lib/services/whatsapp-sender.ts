import { env } from "@/lib/config/env";
import { connectWhatsApp, WhatsAppNotConfiguredError } from "@/lib/services/whatsapp-connection";

export { WhatsAppNotConfiguredError };

export function isWhatsAppConfigured(): boolean {
  return env.WHATSAPP_CHANNEL_JID.length > 0;
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
 * Posts one text message to the configured WhatsApp Channel. Connects,
 * sends, disconnects — same one-shot-per-call shape as
 * lib/services/telegram-sender.ts, not a long-lived bot process.
 */
export async function sendWhatsAppMessage(text: string): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_CHANNEL_JID is not set.");
  }
  const { sock, close } = await connectWhatsApp();
  try {
    await sock.sendMessage(env.WHATSAPP_CHANNEL_JID, { text });
  } finally {
    await close();
  }
}

/**
 * Posts several products in one connection (one message each, image +
 * caption when the product has a real photo) — opening a fresh
 * connection per post would be wasteful for a 5-6 item daily digest. A
 * short delay between posts keeps this looking like a human posting a
 * few updates, not a burst of automated traffic.
 */
export async function sendWhatsAppMessages(posts: WhatsAppOutgoingPost[]): Promise<void> {
  if (!isWhatsAppConfigured()) {
    throw new WhatsAppNotConfiguredError("WHATSAPP_CHANNEL_JID is not set.");
  }
  if (posts.length === 0) return;

  const { sock, close } = await connectWhatsApp();
  try {
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]!;
      if (post.imageUrl) {
        await sock.sendMessage(env.WHATSAPP_CHANNEL_JID, {
          image: { url: post.imageUrl },
          caption: post.text,
        });
      } else {
        await sock.sendMessage(env.WHATSAPP_CHANNEL_JID, { text: post.text });
      }
      if (i < posts.length - 1) await sleep(BETWEEN_POSTS_DELAY_MS);
    }
  } finally {
    await close();
  }
}
