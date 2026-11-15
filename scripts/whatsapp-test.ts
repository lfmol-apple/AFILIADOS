import "dotenv/config";
import { sendWhatsAppMessage, isWhatsAppConfigured } from "@/lib/services/whatsapp-sender";

/**
 * One-off sanity check after scripts/whatsapp-pair.ts — a single harmless
 * message, so testing the connection doesn't mean posting the real daily
 * "produtos em alta" content as the channel's first-ever message.
 */
async function main() {
  if (!isWhatsAppConfigured()) {
    console.error("WHATSAPP_CHANNEL_JID ainda não está no .env — rode scripts/whatsapp-pair.ts primeiro.");
    process.exitCode = 1;
    return;
  }
  await sendWhatsAppMessage("✅ PreçoCaindo conectado — este canal já pode receber os posts automáticos.");
  console.log("Mensagem enviada.");
}

main().catch((err) => {
  console.error("whatsapp-test falhou:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
