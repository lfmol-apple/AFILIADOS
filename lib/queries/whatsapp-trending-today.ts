import { getTopClickedProductsMulti } from "@/lib/queries/performance-dashboard";

export interface WhatsAppTrendingItem {
  title: string;
  merchant: "MERCADO_LIVRE" | "SHOPEE" | "AMAZON";
  /** Our own product page, e.g. "/produto/xxx" — never a /go/ redirect:
   * the owner's brief (2026-11-15) is for the click to land on the site
   * itself, not skip straight to the merchant. */
  href: string;
}

/**
 * "Produtos em alta hoje" for the WhatsApp Channel digest (owner's brief,
 * 2026-11-15: "mostrar os produtos em alta todos os dias"). Reuses the
 * same real-click data already shown on /admin/produtos-populares
 * (getTopClickedProductsMulti) — re-ranked by the last-7-days count
 * instead of all-time, so a product's CURRENT momentum decides the order,
 * not a permanent all-time champion. 7 days, not 24h, on purpose: this
 * site's daily traffic is still small enough that a strict same-day
 * window would often come back empty, breaking the "every day" promise.
 */
export async function loadWhatsAppTrendingToday(
  limit = 6,
): Promise<WhatsAppTrendingItem[]> {
  const rows = await getTopClickedProductsMulti(100);
  const withPage = rows.filter(
    (r): r is typeof r & { href: string } => r.href !== null,
  );
  const sorted = [...withPage].sort(
    (a, b) => b.clicks7d - a.clicks7d || b.clicksAllTime - a.clicksAllTime,
  );
  return sorted.slice(0, limit).map((r) => ({
    title: r.title,
    merchant: r.merchant,
    href: r.href,
  }));
}
