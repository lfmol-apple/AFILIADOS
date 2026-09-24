import {
  shopeeNumeric,
  type ShopeeProductOfferNode,
} from "@/lib/providers/shopee-provider";
import { scoreOffer } from "@/lib/services/shopee-cycle-collector";

/**
 * Widens Shopee discovery beyond page 1 of the generic feed. Terms mirror the
 * /ofertas categories and lean on what people actually search for; nothing
 * here touches public ranking (that stays commission-free) — commission only
 * helps decide which NEW offers are worth registering, through the same
 * MonetizationScore the refresh job already uses.
 */
export const SHOPEE_SWEEP_KEYWORDS: readonly string[] = [
  "creatina",
  "whey protein",
  "colageno",
  "racao gatos",
  "antipulgas caes",
  "fralda",
  "protetor solar",
  "serum vitamina c",
  "shampoo",
  "carregador turbo",
  "fone bluetooth",
  "power bank",
  "smartwatch",
  "ventilador",
  "fritadeira eletrica",
  "aspirador robo",
  "lencol casal",
  "tenis masculino",
  "bolsa feminina",
  "furadeira",
  "lampada led",
  "filamento pla",
  "mouse gamer",
  "teclado",
];

export const SWEEP_KEYWORDS_PER_CYCLE = 3;
export const SWEEP_PAGES_PER_KEYWORD = 2;
export const SWEEP_PAGE_LIMIT = 50;
/** Shopee's `sales` field runs low (most items are under 10, the best keyword
 * results reach a few hundred), so the floor is small: it only screens out
 * items nobody has bought, and a low rating would hurt visitors' trust. */
export const SWEEP_MIN_SALES = 10;
export const SWEEP_MIN_RATING = 4.5;
export const SWEEP_MAX_NEW_PER_CYCLE = 25;

export interface SweepRequest {
  keyword: string;
  page: number;
}

/**
 * Deterministic rotation from the number of earlier runs: each cycle takes the
 * next few keywords (wrapping) and, once every keyword has been seen at pages
 * 1-2, moves on to the following pair of pages, so new items keep surfacing
 * instead of the same top results every time.
 */
export function planSweep(priorRuns: number): SweepRequest[] {
  const total = SHOPEE_SWEEP_KEYWORDS.length;
  const start = (priorRuns * SWEEP_KEYWORDS_PER_CYCLE) % total;
  const lap = Math.floor((priorRuns * SWEEP_KEYWORDS_PER_CYCLE) / total);
  const firstPage = 1 + (lap % 5) * SWEEP_PAGES_PER_KEYWORD;
  const requests: SweepRequest[] = [];
  for (let k = 0; k < SWEEP_KEYWORDS_PER_CYCLE; k += 1) {
    const keyword = SHOPEE_SWEEP_KEYWORDS[(start + k) % total]!;
    for (let p = 0; p < SWEEP_PAGES_PER_KEYWORD; p += 1) {
      requests.push({ keyword, page: firstPage + p });
    }
  }
  return requests;
}

/** Keeps only new, established, well-rated offers, best score first. */
export function selectNewSweepOffers(
  offers: ShopeeProductOfferNode[],
  knownItemIds: ReadonlySet<string>,
  max: number = SWEEP_MAX_NEW_PER_CYCLE,
): ShopeeProductOfferNode[] {
  const seen = new Set<string>();
  const eligible: Array<{ offer: ShopeeProductOfferNode; score: number }> = [];
  for (const offer of offers) {
    const id = String(offer.itemId);
    if (knownItemIds.has(id) || seen.has(id)) continue;
    const rating = shopeeNumeric(offer.ratingStar);
    if ((offer.sales ?? 0) < SWEEP_MIN_SALES) continue;
    if (rating === undefined || rating < SWEEP_MIN_RATING) continue;
    seen.add(id);
    eligible.push({ offer, score: scoreOffer(offer).score ?? 0 });
  }
  return eligible
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.offer);
}

/**
 * Extra-commission discovery (owner's decision, 2026-09-24): instead of
 * rotating fixed keywords, walk Shopee's own list of offers that carry the
 * seller's extra commission (`isAMSOffer`), most sold first (`sortType: 2`),
 * a few pages per cycle, and keep only the ones that pay well per sale.
 * Confirmed live: the top 600 of that list hold 37 offers with sales >= 500,
 * rating >= 4.5 and commission >= R$ 10.
 */
export const AMS_SORT_MOST_SOLD = 2;
export const AMS_PAGES_PER_CYCLE = 3;
/** Pages of SWEEP_PAGE_LIMIT offers; a lap ends here and starts over. */
export const AMS_MAX_PAGE = 20;
export const AMS_MIN_SALES = 500;
export const AMS_MIN_RATING = 4.5;
/** Commission in reais per sale (Shopee's `commission` field). */
export const AMS_MIN_COMMISSION_BRL = 10;
export const AMS_MAX_NEW_PER_CYCLE = 25;

/** Consecutive pages for this cycle, wrapping inside 1..AMS_MAX_PAGE. */
export function planAmsSweep(priorRuns: number): number[] {
  const start = (priorRuns * AMS_PAGES_PER_CYCLE) % AMS_MAX_PAGE;
  return Array.from(
    { length: AMS_PAGES_PER_CYCLE },
    (_, k) => ((start + k) % AMS_MAX_PAGE) + 1,
  );
}

/**
 * New, extra-commission, well-sold and well-rated offers that pay at least
 * AMS_MIN_COMMISSION_BRL per sale, biggest commission in reais first, then
 * most sold, then best rated.
 */
export function selectExtraCommissionOffers(
  offers: ShopeeProductOfferNode[],
  knownItemIds: ReadonlySet<string>,
  max: number = AMS_MAX_NEW_PER_CYCLE,
): ShopeeProductOfferNode[] {
  const seen = new Set<string>();
  const eligible: ShopeeProductOfferNode[] = [];
  for (const offer of offers) {
    const id = String(offer.itemId);
    if (knownItemIds.has(id) || seen.has(id)) continue;
    const rating = shopeeNumeric(offer.ratingStar);
    const commission = shopeeNumeric(offer.commission);
    const extra = shopeeNumeric(offer.sellerCommissionRate);
    if (extra === undefined || extra <= 0) continue;
    if ((offer.sales ?? 0) < AMS_MIN_SALES) continue;
    if (rating === undefined || rating < AMS_MIN_RATING) continue;
    if (commission === undefined || commission < AMS_MIN_COMMISSION_BRL)
      continue;
    seen.add(id);
    eligible.push(offer);
  }
  return eligible
    .sort(
      (a, b) =>
        (shopeeNumeric(b.commission) ?? 0) -
          (shopeeNumeric(a.commission) ?? 0) ||
        (b.sales ?? 0) - (a.sales ?? 0) ||
        (shopeeNumeric(b.ratingStar) ?? 0) - (shopeeNumeric(a.ratingStar) ?? 0),
    )
    .slice(0, max);
}
