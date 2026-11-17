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
 * Extremely commercial, visual, instant-to-grasp caption (owner's brief,
 * 2026-11-17: "o usuário precisa perceber a vantagem simplesmente ao
 * olhar para a mensagem"). WhatsApp's own native formatting —
 * `~riscado~` / `*negrito*` — not an image overlay or anything
 * client-side. Always links straight to the real merchant affiliate link
 * (item.affiliateUrl), never our own site: no mandatory stop on
 * precocaindo.com.br for this channel.
 *
 * The two "before/after" cases are never blended: verified_drop may
 * honestly claim a real queda comprovada pelo histórico do PreçoCaindo;
 * store_discount only ever presents the loja's own disclosed discount,
 * explicitly never as something we verified. price_only (no reliable
 * reference) shows just the current price — never a fabricated "antes".
 */
export function buildWhatsAppItemCaption(item: WhatsAppTrendingItem): string {
  const lines = [`🔥 *${item.title}*`, `_${MERCHANT_LABEL[item.merchant]}_`, ""];

  switch (item.price.kind) {
    case "verified_drop": {
      const { previousPrice, currentPrice, dropPercent, isAllTimeLow } = item.price;
      lines.push(`~${formatBRL(previousPrice)}~`);
      lines.push(`*${formatBRL(currentPrice)}*`);
      lines.push(
        isAllTimeLow
          ? `📉 Nunca esteve tão barato — menor preço já registrado pelo PreçoCaindo`
          : `📉 Caiu ${Math.round(dropPercent * 100)}% — queda comprovada pelo histórico do PreçoCaindo`,
      );
      lines.push(`💸 Economia de ${formatBRL(previousPrice - currentPrice)}`);
      break;
    }
    case "store_discount": {
      const { originalPrice, currentPrice, discountPercent } = item.price;
      lines.push(`~${formatBRL(originalPrice)}~`);
      lines.push(`*${formatBRL(currentPrice)}*`);
      lines.push(`🏷️ ${Math.round(discountPercent * 100)}% OFF — desconto anunciado pela loja`);
      lines.push(`💸 Economia de ${formatBRL(originalPrice - currentPrice)}`);
      break;
    }
    case "price_only": {
      lines.push(`*${formatBRL(item.price.currentPrice)}*`);
      break;
    }
  }

  lines.push("");
  lines.push(item.affiliateUrl);
  lines.push("");
  lines.push(
    "⚠️ Preço pode mudar a qualquer momento. Link de afiliado — podemos ganhar comissão, sem custo extra pra você.",
  );

  return lines.join("\n");
}
