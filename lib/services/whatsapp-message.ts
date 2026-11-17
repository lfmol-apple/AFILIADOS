import type { WhatsAppTrendingItem } from "@/lib/queries/whatsapp-trending-today";

const MERCHANT_LABEL: Record<WhatsAppTrendingItem["merchant"], string> = {
  MERCADO_LIVRE: "Mercado Livre",
  SHOPEE: "Shopee",
  AMAZON: "Amazon",
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * One caption per product (owner's brief, 2026-11-16: "quero que as
 * imagens apareçam" — each post is its own image + caption, matching the
 * real deal-channel pattern the owner pointed at, not one wall-of-text
 * message for all of today's products).
 *
 * Unlike lib/services/price-drop-digest.ts's Telegram message (deep-links
 * straight to the merchant on purpose), this links to our OWN product
 * page — owner's brief, 2026-11-15: "como a pessoa vai ver o site".
 *
 * The discount line only appears when `item.verifiedDrop` is set (owner's
 * brief, 2026-11-17: "desconto comprovado, quando houver") — never a
 * fabricated or estimated number for the items that reach this caption
 * through the click- or demand-based tiers instead.
 */
export function buildWhatsAppItemCaption(
  item: WhatsAppTrendingItem,
  siteUrl: string,
): string {
  const lines = [`🔥 *${item.title}*`, "", `_${MERCHANT_LABEL[item.merchant]}_`];

  if (item.verifiedDrop) {
    const { currentPrice, previousPrice, dropPercent, isAllTimeLow } = item.verifiedDrop;
    lines.push(`💰 ${formatBRL(currentPrice)}`);
    lines.push(
      isAllTimeLow
        ? `📉 Nunca esteve tão barato por aqui — menor preço já registrado`
        : `📉 Caiu ${Math.round(dropPercent * 100)}% — estava em ${formatBRL(previousPrice)}`,
    );
  }

  lines.push(`${siteUrl}${item.href}`);
  return lines.join("\n");
}
