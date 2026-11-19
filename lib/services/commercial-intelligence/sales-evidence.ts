/**
 * Sales/demand evidence, properly separated by TYPE (owner's correction,
 * 2026-11-19, section 2: "não permita que indicadores diferentes sejam
 * apresentados como se demonstrassem a mesma realidade comercial").
 *
 * Root cause fixed here: the previous version scored "demand" for a
 * keyword-search-discovered item using bestsellerRankToScore(position in
 * a 5-result search) — a search-relevance position has NOTHING to do
 * with sales. That function must only ever be called with a REAL official
 * bestseller-rank position (GET /highlights/{site}/category/{id}), never
 * a search-result index. SEARCH_RELEVANCE_ONLY exists specifically so a
 * discovery mechanism can be recorded truthfully as "this is how we FOUND
 * it," without it ever contributing to a demand score.
 */

export type SalesEvidenceType =
  | "official_rank"
  | "sold_quantity_exact"
  | "sold_quantity_bucket"
  | "search_relevance_only"
  | "unknown";

export interface SalesEvidence {
  type: SalesEvidenceType;
  /** 0..100, or null when this type carries no demand score by design
   * (search_relevance_only, unknown). */
  demandScore: number | null;
  detail: string;
}

/** Real bestseller rank (1 = top of category) -> 0..100. Floor of 40
 * because a highlighted product is already among a category's best, by
 * definition — never near-zero. Only ever call this with a REAL rank
 * position from the Highlights API. */
export function officialRankEvidence(position: number): SalesEvidence {
  const score = Math.max(40, 100 - (position - 1) * 3);
  return {
    type: "official_rank",
    demandScore: score,
    detail: `Posição ${position} no ranking oficial de mais vendidos da categoria (Mercado Livre).`,
  };
}

/**
 * Real exact sold count (Shopee's productOfferV2.sales — the only source
 * that gives an exact number, never bucketed). Gentler curve than the
 * Shopee cycle's own salesToScore (which this project must not alter —
 * it's a separate, already-tested production formula): reaches high
 * scores only well past 10k, so a 2026-style "ganhos extras" product with
 * 10-30k real sales doesn't flatten to the same number as one with
 * 500k+.
 */
export function exactSoldQuantityEvidence(sold: number): SalesEvidence {
  const score = Math.min(95, Math.round(Math.log10(sold + 1) * 19));
  return {
    type: "sold_quantity_exact",
    demandScore: score,
    detail: `${sold} unidades vendidas (número exato, Shopee).`,
  };
}

/**
 * ML's own affiliate panel shows sold count as a rounded-up bucket
 * ("+10.000 vendidos"), never an exact number — owner's explicit rule,
 * 2026-11-19: "quando os dados forem em faixas, preserve essa limitação.
 * Não invente diferenças entre produtos na mesma faixa." Every listing
 * reporting the SAME bucket gets the exact same score, on purpose —
 * differentiating them is Price/commission/quality's job, not this one's.
 */
const SOLD_BUCKETS: ReadonlyArray<{ min: number; score: number }> = [
  { min: 10_000, score: 85 },
  { min: 5_000, score: 75 },
  { min: 1_000, score: 65 },
  { min: 500, score: 55 },
  { min: 100, score: 45 },
  { min: 50, score: 38 },
  { min: 1, score: 30 },
];

export function bucketedSoldQuantityEvidence(bucketFloor: number): SalesEvidence {
  const bucket = SOLD_BUCKETS.find((b) => bucketFloor >= b.min) ?? { min: 0, score: 20 };
  return {
    type: "sold_quantity_bucket",
    demandScore: bucket.score,
    detail: `"+${bucketFloor} vendidos" (faixa exibida pelo próprio Mercado Livre, não é número exato) — mesma nota para qualquer produto na mesma faixa.`,
  };
}

/**
 * The position a keyword search returned this item in. NEVER a demand
 * score (demandScore: null, enforced by the type) — this exists only so
 * the discovery mechanism is traceable, never silently upgraded into
 * "evidence of high demand."
 */
export function searchRelevanceOnly(keyword: string, position: number): SalesEvidence {
  return {
    type: "search_relevance_only",
    demandScore: null,
    detail: `Posição ${position} na busca por "${keyword}" — relevância de busca, não é evidência de demanda ou de vendas.`,
  };
}

export function unknownSalesEvidence(): SalesEvidence {
  return {
    type: "unknown",
    demandScore: null,
    detail: "Sem evidência real de ranking de vendas ou quantidade vendida para este anúncio ainda.",
  };
}
