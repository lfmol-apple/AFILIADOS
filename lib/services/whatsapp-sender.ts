import { env } from "@/lib/config/env";
import { connectWhatsApp, WhatsAppNotConfiguredError } from "@/lib/services/whatsapp-connection";

export { WhatsAppNotConfiguredError };

export function isWhatsAppConfigured(): boolean {
  return env.WHATSAPP_CHANNEL_JID.length > 0;
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
