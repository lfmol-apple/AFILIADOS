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
/** Only established, well-rated items: a fresh listing with 3 sales and a
 * 5.0 average is noise, and a low-rated one would hurt visitors' trust. */
export const SWEEP_MIN_SALES = 100;
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
