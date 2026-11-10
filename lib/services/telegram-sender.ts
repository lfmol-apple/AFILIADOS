import { env } from "@/lib/config/env";

export class TelegramNotConfiguredError extends Error {}

export function isTelegramConfigured(): boolean {
  return env.TELEGRAM_BOT_TOKEN.length > 0 && env.TELEGRAM_CHANNEL_ID.length > 0;
}

/** Posts one message to the owner's channel through Telegram's Bot HTTP
 * API — no SDK, same fetch-only style as lib/services/email-sender.ts.
 * Throws instead of silently skipping, so a misconfigured cron shows up
 * as a FAILED run rather than a quiet no-op. */
export async function sendTelegramMessage(
  text: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ messageId: number }> {
  if (!isTelegramConfigured()) {
    throw new TelegramNotConfiguredError(
      "TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID must both be set.",
    );
  }

  const response = await fetchImpl(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHANNEL_ID,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    },
  );

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Telegram responded ${response.status}: ${detail}`);
  }
  const body = (await response.json().catch(() => ({}))) as {
    result?: { message_id?: number };
  };
  return { messageId: body.result?.message_id ?? 0 };
}
