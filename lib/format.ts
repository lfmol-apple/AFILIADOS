export function formatCurrency(
  value: number,
  currency: string = "BRL",
): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    value,
  );
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDay(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

/**
 * Marketplace listing titles (Mercado Livre/Shopee sellers' own, kept
 * verbatim — never rewritten as fact) routinely run 100+ characters,
 * keyword-stuffed by the seller. Google truncates a <title> tag around
 * ~60 characters in search results (confirmed live, 2026-09-14: a real
 * product title measured 124 chars) — past that, our own suffix
 * ("preço e histórico") never even renders, or Google algorithmically
 * rewrites the whole tag itself, out of our control either way. Used
 * only for the <title>/OG/Twitter metadata, never the on-page H1 (which
 * stays the full real name — a visitor who already clicked benefits from
 * the complete title, a search snippet does not).
 */
export function truncateForTitleTag(text: string, maxLength = 60): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trim();
}
