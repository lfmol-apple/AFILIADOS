import type { WhatsAppTrendingItem } from "@/lib/queries/whatsapp-trending-today";

const MERCHANT_LABEL: Record<WhatsAppTrendingItem["merchant"], string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
  AMAZON: "Amazon",
};

/**
 * One caption per product (owner's brief, 2026-11-16: "quero que as
 * imagens apareçam" — each post is its own image + caption, matching the
 * real deal-channel pattern the owner pointed at, not one wall-of-text
 * message for all of today's products).
 *
 * Unlike lib/services/price-drop-digest.ts's Telegram message (deep-links
 * straight to the merchant on purpose), this links to our OWN product
 * page — owner's brief, 2026-11-15: "como a pessoa vai ver o site".
 */
export function buildWhatsAppItemCaption(
  item: WhatsAppTrendingItem,
  siteUrl: string,
): string {
  return [
    `🔥 *${item.title}*`,
    "",
    `_${MERCHANT_LABEL[item.merchant]}_`,
    `${siteUrl}${item.href}`,
  ].join("\n");
}
