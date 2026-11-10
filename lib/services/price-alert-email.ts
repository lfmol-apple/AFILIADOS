export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Pure: the double opt-in confirmation email — no DB, no network. The
 * alert only starts checking prices once this link is clicked (see
 * lib/services/price-alert.ts's confirmPriceAlert). */
export function buildConfirmationEmail(input: {
  productTitle: string;
  targetPrice: number;
  confirmUrl: string;
}): EmailContent {
  const { productTitle, targetPrice, confirmUrl } = input;
  const subject = `Confirme seu alerta de preço — ${productTitle}`;
  const text = [
    `Confirme seu alerta de preço para "${productTitle}".`,
    ``,
    `Você será avisado quando o preço chegar a ${formatBRL(targetPrice)} ou menos.`,
    ``,
    `Confirmar: ${confirmUrl}`,
    ``,
    `Se você não pediu esse alerta, pode ignorar este e-mail — nada será criado sem essa confirmação.`,
  ].join("\n");
  const html = `
    <p>Confirme seu alerta de preço para <strong>${esc(productTitle)}</strong>.</p>
    <p>Você será avisado quando o preço chegar a <strong>${formatBRL(targetPrice)}</strong> ou menos.</p>
    <p><a href="${esc(confirmUrl)}">Confirmar alerta</a></p>
    <p style="color:#666;font-size:13px">Se você não pediu esse alerta, pode ignorar este e-mail — nada será criado sem essa confirmação.</p>
  `.trim();
  return { subject, html, text };
}

/** Pure: the "it dropped" email — fires once per alert (see
 * jobs/price-alert-check.ts), only when currentPrice really is at or
 * below targetPrice, with the real number, never a rounded/approximate
 * one. */
export function buildTriggeredEmail(input: {
  productTitle: string;
  targetPrice: number;
  currentPrice: number;
  productUrl: string;
}): EmailContent {
  const { productTitle, targetPrice, currentPrice, productUrl } = input;
  const subject = `Caiu! ${productTitle} está em ${formatBRL(currentPrice)}`;
  const text = [
    `O preço de "${productTitle}" chegou a ${formatBRL(currentPrice)} — você pediu para ser avisado em ${formatBRL(targetPrice)} ou menos.`,
    ``,
    `Ver agora: ${productUrl}`,
    ``,
    `Este alerta já foi usado e não vai notificar novamente.`,
  ].join("\n");
  const html = `
    <p>O preço de <strong>${esc(productTitle)}</strong> chegou a <strong>${formatBRL(currentPrice)}</strong> — você pediu para ser avisado em ${formatBRL(targetPrice)} ou menos.</p>
    <p><a href="${esc(productUrl)}">Ver agora</a></p>
    <p style="color:#666;font-size:13px">Este alerta já foi usado e não vai notificar novamente.</p>
  `.trim();
  return { subject, html, text };
}
