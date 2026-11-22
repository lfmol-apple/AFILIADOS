import {
  EVIDENCE_KEYS,
  MISSING_DATA_KEYS,
  type AnalystEvidenceInput,
  type EvidenceKey,
  type MissingDataKey,
} from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Structural hallucination guard — owner's authorization, 2026-11-22,
 * section 2: "não permita que a IA invente... qualquer informação não
 * presente nas fontes." This never asks a second model call to "check"
 * the first (that would just be a second opinion, not a guarantee) —
 * instead it recomputes, from the SAME real input the model was given,
 * which evidence keys are ACTUALLY present, and strips (never silently
 * accepts) any key the model claimed that isn't genuinely backed by the
 * real data. A response that, after stripping, claims ZERO real evidence
 * is rejected outright (see validateAndSanitizeResponse) — a recommendation
 * cannot stand on nothing.
 */
export function computeRealEvidenceKeys(input: AnalystEvidenceInput): Set<EvidenceKey> {
  const real = new Set<EvidenceKey>();
  if (input.salesEvidence.type === "official_rank" && input.salesEvidence.demandScore !== null) real.add("sales_official_rank");
  if (input.salesEvidence.type === "search_relevance_only") real.add("sales_search_relevance_only");
  if (input.commissionEvidence.type === "confirmed_individual") real.add("commission_confirmed_individual");
  if (input.commissionEvidence.type === "promotional_temporary") real.add("commission_promotional_temporary");
  if (input.commissionEvidence.type === "category_tier") real.add("commission_category_tier");
  if (input.commissionEvidence.type === "historical") real.add("commission_historical");
  if (input.priceCompetitiveness.competitivenessScore !== null) real.add("price_competitiveness_scored");
  if (input.priceCompetitiveness.hasConfirmedPriceDrop) real.add("price_drop_confirmed");
  if (input.qualitySignal !== null) real.add("quality_signal_present");
  if (input.trendDirection === "rising") real.add("trend_rising");
  if (input.trendDirection === "falling") real.add("trend_falling");
  if (input.matchedEventName !== null) real.add("matched_seasonal_event");
  if (input.corroborationSourceCount >= 2) real.add("corroboration_multi_source");
  return real;
}

export function computeRealMissingDataKeys(input: AnalystEvidenceInput): Set<MissingDataKey> {
  const missing = new Set<MissingDataKey>();
  if (input.salesEvidence.type === "unknown" || input.salesEvidence.type === "search_relevance_only") missing.add("sales_evidence_unknown");
  if (input.commissionEvidence.type === "unknown") missing.add("commission_unknown");
  if (input.priceCompetitiveness.siblingOfferCount === 0) missing.add("no_sibling_offers_for_price_comparison");
  if (input.qualitySignal === null) missing.add("quality_signal_unknown");
  if (input.trendDirection === null || input.trendDirection === "unknown" || input.trendDirection === "new") missing.add("trend_unknown_or_new");
  if (input.corroborationSourceCount <= 1) missing.add("single_source_only");
  if (input.categoryId === null) missing.add("category_unknown");
  return missing;
}

export interface RawAnalystResponse {
  recommendation?: unknown;
  commercialScore?: unknown;
  confidence?: unknown;
  favorableArguments?: unknown;
  risks?: unknown;
  evidenceUsed?: unknown;
  missingData?: unknown;
}

export interface SanitizedAnalystResponse {
  recommendation: "priorizar" | "observar" | "rejeitar";
  commercialScore: number;
  confidence: number;
  favorableArguments: string[];
  risks: string[];
  evidenceUsed: EvidenceKey[];
  missingData: MissingDataKey[];
}

/** Specific, auditable reason a response was rejected — owner's
 * authorization, 2026-11-22 ("Operação Cérebro Comercial", Fase A,
 * requirement 3: "registre os motivos específicos de rejeição"), never
 * a single generic message. */
export type RejectionReason =
  | "invalid_recommendation"
  | "invalid_commercialScore"
  | "invalid_confidence"
  | "invalid_favorableArguments"
  | "invalid_risks"
  | "invalid_evidenceUsed_or_missingData_shape"
  | "zero_verified_evidence";

export type ValidationResult = { ok: true; value: SanitizedAnalystResponse } | { ok: false; reason: RejectionReason };

/** The real, detailed check — returns WHY a response was rejected, not
 * just that it was. `validateAndSanitizeResponse` below is a thin,
 * backward-compatible wrapper over this for callers that only need
 * accept/reject. */
export function validateAndSanitizeResponseDetailed(raw: RawAnalystResponse, input: AnalystEvidenceInput): ValidationResult {
  if (raw.recommendation !== "priorizar" && raw.recommendation !== "observar" && raw.recommendation !== "rejeitar") {
    return { ok: false, reason: "invalid_recommendation" };
  }
  if (typeof raw.commercialScore !== "number" || !Number.isFinite(raw.commercialScore)) return { ok: false, reason: "invalid_commercialScore" };
  if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence)) return { ok: false, reason: "invalid_confidence" };
  if (!Array.isArray(raw.favorableArguments) || !raw.favorableArguments.every((a) => typeof a === "string")) {
    return { ok: false, reason: "invalid_favorableArguments" };
  }
  if (!Array.isArray(raw.risks) || !raw.risks.every((r) => typeof r === "string")) return { ok: false, reason: "invalid_risks" };
  if (!Array.isArray(raw.evidenceUsed) || !Array.isArray(raw.missingData)) return { ok: false, reason: "invalid_evidenceUsed_or_missingData_shape" };

  const realEvidence = computeRealEvidenceKeys(input);
  const realMissing = computeRealMissingDataKeys(input);

  // The real cross-check: only keep a claimed key if it's both a
  // genuine member of the closed vocabulary AND actually true of this
  // real input — anything else is a hallucination and is silently
  // dropped, never trusted.
  const evidenceUsed = raw.evidenceUsed.filter(
    (k): k is EvidenceKey => typeof k === "string" && (EVIDENCE_KEYS as readonly string[]).includes(k) && realEvidence.has(k as EvidenceKey),
  );
  const missingData = raw.missingData.filter(
    (k): k is MissingDataKey => typeof k === "string" && (MISSING_DATA_KEYS as readonly string[]).includes(k) && realMissing.has(k as MissingDataKey),
  );

  // A recommendation standing on zero real, verified evidence is never
  // trustworthy — reject outright rather than accept a bare opinion.
  if (evidenceUsed.length === 0) return { ok: false, reason: "zero_verified_evidence" };

  return {
    ok: true,
    value: {
      recommendation: raw.recommendation,
      commercialScore: Math.min(100, Math.max(0, Math.round(raw.commercialScore))),
      confidence: Math.min(1, Math.max(0, raw.confidence)),
      favorableArguments: raw.favorableArguments.slice(0, 10),
      risks: raw.risks.slice(0, 10),
      evidenceUsed,
      missingData,
    },
  };
}

/** Returns null when the response is unusable (wrong shape, or claims
 * ZERO real evidence after stripping hallucinated keys) — the caller
 * must treat null as "reject this response", never patch it up.
 * Backward-compatible accept/reject view over validateAndSanitizeResponseDetailed. */
export function validateAndSanitizeResponse(raw: RawAnalystResponse, input: AnalystEvidenceInput): SanitizedAnalystResponse | null {
  const result = validateAndSanitizeResponseDetailed(raw, input);
  return result.ok ? result.value : null;
}
