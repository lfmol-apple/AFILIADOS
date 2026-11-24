/**
 * AI Commercial Analyst — shared types (owner's authorization, 2026-11-22,
 * "Motor de Inteligência Comercial com IA").
 *
 * `AnalystEvidenceInput` is the ONLY thing the model ever sees — every
 * field here traces directly to a real, already-verified value from
 * lib/services/vitrine-selection.ts's PooledCandidate. Nothing here is
 * invented for the prompt's sake; a field the real pipeline doesn't know
 * is null, never guessed.
 *
 * `EVIDENCE_KEYS`/`MISSING_DATA_KEYS` are closed vocabularies, not free
 * text — the model can only claim evidence it was actually given (see
 * hallucination-guard.ts, which cross-checks every claimed key against
 * the real input before accepting the response).
 */

export const EVIDENCE_KEYS = [
  "sales_official_rank",
  "sales_search_relevance_only",
  "commission_confirmed_individual",
  "commission_promotional_temporary",
  "commission_category_tier",
  "commission_historical",
  "price_competitiveness_scored",
  "price_drop_confirmed",
  "quality_signal_present",
  "trend_rising",
  "trend_falling",
  "matched_seasonal_event",
  "corroboration_multi_source",
] as const;
export type EvidenceKey = (typeof EVIDENCE_KEYS)[number];

export const MISSING_DATA_KEYS = [
  "sales_evidence_unknown",
  "commission_unknown",
  "no_sibling_offers_for_price_comparison",
  "quality_signal_unknown",
  "trend_unknown_or_new",
  "single_source_only",
  "category_unknown",
] as const;
export type MissingDataKey = (typeof MISSING_DATA_KEYS)[number];

export type AnalystRecommendation = "priorizar" | "observar" | "rejeitar";

export interface AnalystEvidenceInput {
  merchantListingId: string;
  title: string;
  brand: string | null;
  categoryId: string | null;
  currentPriceBrl: number;
  salesEvidence: { type: string; demandScore: number | null };
  commissionEvidence: { type: string; rate: number | null; estimatedValueBrl: number | null; ageDays: number | null; stale: boolean };
  priceCompetitiveness: { competitivenessScore: number | null; siblingOfferCount: number; hasConfirmedPriceDrop: boolean };
  qualitySignal: number | null;
  trendDirection: string | null;
  matchedEventName: string | null;
  corroborationSourceCount: number;
  discoverySource: string | null;
}

export interface AnalystEvaluation {
  merchantListingId: string;
  recommendation: AnalystRecommendation;
  /** 0-100 — the AI's own qualitative read, NEVER a replacement for
   * rankingScore (lib/services/vitrine-selection.ts). Used only as an
   * additional, independent annotation — see ai-assisted methodology's
   * own doc comment for how the two are combined. */
  commercialScore: number;
  /** 0-1. */
  confidence: number;
  favorableArguments: string[];
  risks: string[];
  /** Closed-vocabulary subset of EVIDENCE_KEYS, validated against the
   * real input before this evaluation is ever persisted or returned. */
  evidenceUsed: EvidenceKey[];
  /** Closed-vocabulary subset of MISSING_DATA_KEYS. */
  missingData: MissingDataKey[];
  /** True when this evaluation is a deterministic fallback (API not
   * configured, budget exceeded, response failed validation) rather than
   * a real model call — never silently indistinguishable from a real one. */
  isFallback: boolean;
  fallbackReason: string | null;
  model: string | null;
  costUsd: number | null;
  cached: boolean;
}
