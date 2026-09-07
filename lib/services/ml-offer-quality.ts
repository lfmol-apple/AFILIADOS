import type {
  MercadoLivreCatalogItem,
  MercadoLivreSellerReputation,
} from "@/lib/providers/mercado-livre-provider";

/**
 * "offerQuality" component for a Mercado Livre offer's MonetizationScore —
 * built ONLY from signals confirmed real and available (2026-09-07, see
 * docs/MONETIZATION_SCORE.md's capability matrix): condition, free
 * shipping, a genuine price discount (original_price > price), and seller
 * reputation level. sold_quantity and rating/reviews are NOT available for
 * other sellers' items via this app's current permissions (GET /items/{id}
 * and GET /reviews/item/{id} both 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES)
 * — never guessed here or anywhere downstream.
 *
 * Pure and deterministic, same category of judgment call as
 * scripts/shopee-first-cycle.ts's commissionToScore/salesToScore: the
 * inputs are always real; only this mapping curve is an explicit, documented
 * choice, not a discovered fact.
 */
export function offerQualityScore(
  item: MercadoLivreCatalogItem,
  seller: MercadoLivreSellerReputation | null,
): number {
  let score = 40;

  if (item.condition === "new") score += 20;
  if (item.shipping?.free_shipping) score += 15;

  const discountPercent = getDiscountPercent(item);
  if (discountPercent !== null) {
    score += Math.min(15, Math.round(discountPercent * 30));
  }

  score += REPUTATION_LEVEL_BONUS[seller?.levelId ?? ""] ?? 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Mercado Livre's real seller_reputation.level_id scale (color-coded,
 * "5_green" best to "1_red" worst) — an unrecognized or null level_id
 * (e.g. a brand-new seller with no history yet) contributes 0, never a
 * penalty for simply lacking data. */
const REPUTATION_LEVEL_BONUS: Record<string, number> = {
  "5_green": 15,
  "4_light_green": 10,
  "3_yellow": 5,
  "2_orange": 0,
  "1_red": -10,
};

/** Real discount fraction (0-1) when the offer has a genuine original_price
 * higher than its current price; null otherwise — never fabricated when
 * original_price is absent/null (confirmed live: most offers have no
 * discount, some do). */
export function getDiscountPercent(item: MercadoLivreCatalogItem): number | null {
  if (item.original_price === null || item.original_price <= item.price) return null;
  return (item.original_price - item.price) / item.original_price;
}
