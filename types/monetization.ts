import type { EvidenceQuality } from "./commercial-signal";

export type { EvidenceQuality } from "./commercial-signal";

/** One scored dimension of a MonetizationScore. `value` is null when there
 * is no real evidence for this dimension — never a fabricated number, and
 * never converted to 0 (project brief: "nunca converter UNKNOWN em zero").
 * `quality` always reflects how the value (or its absence) was obtained. */
export interface MonetizationScoreComponent {
  value: number | null;
  quality: EvidenceQuality;
  /** Short, human-readable justification for this specific component —
   * e.g. "trendRank=3 observado via Mercado Livre highlights em 2026-09-05". */
  detail: string;
}

export interface MonetizationScoreComponents {
  demand: MonetizationScoreComponent;
  commission: MonetizationScoreComponent;
  trend: MonetizationScoreComponent;
  historicalConversion: MonetizationScoreComponent;
  offerQuality: MonetizationScoreComponent;
}

export interface MonetizationScoreInput {
  /** Real observed demand signal (e.g. bestseller/trend rank -> normalized
   * strength), or null if none exists yet for this listing. */
  demandSignal: { value: number; quality: EvidenceQuality } | null;
  /** Real or estimated commission, already in the listing's currency —
   * null when the merchant hasn't disclosed a commission rate/estimate. */
  commissionSignal: { value: number; quality: EvidenceQuality } | null;
  /** Trend/rank movement, when a source provides one — null otherwise. */
  trendSignal: { value: number; quality: EvidenceQuality } | null;
  /** PreçoCaindo's own historical click/conversion rate for this listing
   * or its canonical product, when there's enough history — null for a
   * brand-new listing with no traffic yet. */
  historicalConversionSignal: { value: number; quality: EvidenceQuality } | null;
  /** Non-price offer-quality signal (rating, review count, availability) —
   * intentionally never the OpportunityScore itself (project brief rule:
   * OpportunityScore must never be read into MonetizationScore). */
  offerQualitySignal: { value: number; quality: EvidenceQuality } | null;
}

/**
 * "É uma oportunidade economicamente interessante para o PreçoCaindo
 * investir exposição?" — never shown to the consumer, never mixed with
 * OpportunityScore (which answers "é uma boa compra?" for the visitor).
 *
 * `score`/`confidence` are null when there isn't enough real evidence —
 * this function must never fabricate precision. The future "expected
 * commission per 1,000 exposures/clicks" metric the project brief
 * describes is NOT implemented here: it needs real traffic + conversion
 * history this codebase doesn't have yet. Persisting a premature formula
 * for that would be exactly the "cristalizar prematuramente uma fórmula
 * econômica" the brief explicitly forbids.
 */
export interface MonetizationScoreResult {
  score: number | null;
  confidence: number;
  components: MonetizationScoreComponents;
  reasons: string[];
  missingSignals: string[];
}
