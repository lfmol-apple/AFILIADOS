import "dotenv/config";
import { sendTelegramMessage, isTelegramConfigured } from "@/lib/services/telegram-sender";

/**
 * One-off sanity check for TELEGRAM_BOT_TOKEN/TELEGRAM_CHANNEL_ID right
 * after they're added to .env — a single harmless message, so testing the
 * connection doesn't mean posting real price-drop content as the first
 * thing the channel ever sees. Run with `npm run telegram:test`.
 */
async function main() {
  if (!isTelegramConfigured()) {
    console.error(
      "TELEGRAM_BOT_TOKEN e/ou TELEGRAM_CHANNEL_ID ainda não estão no .env.",
    );
    process.exitCode = 1;
    return;
  }

  const result = await sendTelegramMessage(
    "✅ PreçoCaindo conectado — este canal já pode receber os posts automáticos de queda de preço.",
  );
  console.log(`Mensagem enviada (message_id: ${result.messageId}).`);
}

main().catch((err) => {
  console.error("telegram-test falhou:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
