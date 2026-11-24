/**
 * Pure: turns an outbound affiliate click into the owner's push payload
 * (lib/push/send.ts). A click is a much stronger, much rarer signal than a
 * pageview — real click volume is a small fraction of pageview volume — so
 * unlike describePageviewForOwner this has no once-a-day dedup: every real
 * click notifies.
 */
const MERCHANT_LABEL: Record<string, string> = {
  amazon: "Amazon",
  "mercado-livre": "Mercado Livre",
  shopee: "Shopee",
};

export function describeAffiliateClickForOwner(
  merchant: string,
  productLabel: string,
): { title: string; body: string; url: string } {
  const store = MERCHANT_LABEL[merchant] ?? merchant;
  return {
    title: `🔔 Clique para ${store}`,
    body: productLabel,
    url: "/admin/desempenho",
  };
}
