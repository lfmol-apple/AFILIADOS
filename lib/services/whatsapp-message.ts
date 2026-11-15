import type { WhatsAppTrendingItem } from "@/lib/queries/whatsapp-trending-today";

const MERCHANT_LABEL: Record<WhatsAppTrendingItem["merchant"], string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
  AMAZON: "Amazon",
};

/**
 * Unlike lib/services/price-drop-digest.ts's Telegram message (deep-links
 * straight to the merchant on purpose), this links to our OWN product
 * page — owner's brief, 2026-11-15: "como a pessoa vai ver o site". The
 * click lands on PreçoCaindo first (price history, the price-alert
 * signup, other offers) before ever reaching the merchant.
 */
export function buildWhatsAppTrendingMessage(
  items: WhatsAppTrendingItem[],
  siteUrl: string,
): string {
  const lines = [
    "🔥 *Produtos em alta hoje no PreçoCaindo*",
    "",
    ...items.flatMap((item, i) => [
      `${i + 1}. ${item.title} _(${MERCHANT_LABEL[item.merchant]})_`,
      `${siteUrl}${item.href}`,
      "",
    ]),
    "Preço, histórico e outras lojas: " + siteUrl,
  ];
  return lines.join("\n");
}
