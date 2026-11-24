import "dotenv/config";
import { env } from "@/lib/config/env";

/**
 * Finds TELEGRAM_CHANNEL_ID without a third-party bot: once the bot is an
 * admin of the channel, post (or forward) any message in that channel,
 * then run `npm run telegram:chat-id` — it reads the bot's own pending
 * updates and prints every chat id/title Telegram has seen it in. Needs
 * only TELEGRAM_BOT_TOKEN (the channel id is what this finds).
 */
interface TelegramUpdate {
  channel_post?: { chat: { id: number; title?: string; type: string } };
  message?: { chat: { id: number; title?: string; type: string } };
}

async function main() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN ainda não está no .env.");
    process.exitCode = 1;
    return;
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getUpdates`,
  );
  if (!response.ok) {
    console.error(`Telegram respondeu ${response.status}: ${await response.text()}`);
    process.exitCode = 1;
    return;
  }
  const body = (await response.json()) as { ok: boolean; result: TelegramUpdate[] };
  if (!body.ok) {
    console.error("Telegram retornou ok: false.");
    process.exitCode = 1;
    return;
  }

  const seen = new Map<number, { title: string; type: string }>();
  for (const update of body.result) {
    const chat = update.channel_post?.chat ?? update.message?.chat;
    if (chat) seen.set(chat.id, { title: chat.title ?? "(sem título)", type: chat.type });
  }

  if (seen.size === 0) {
    console.log(
      "Nada ainda. Poste (ou encaminhe) uma mensagem qualquer no canal — com o bot já como admin — e rode de novo.",
    );
    return;
  }

  console.log("Chats encontrados:");
  for (const [id, info] of seen) {
    console.log(`  TELEGRAM_CHANNEL_ID=${id}  (${info.type} — ${info.title})`);
  }
}

main().catch((err) => {
  console.error("telegram-get-chat-id falhou:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
