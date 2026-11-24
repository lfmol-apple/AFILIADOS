import { describe, expect, it } from "vitest";
import {
  validateAndSanitizeResponse,
  validateAndSanitizeResponseDetailed,
  computeRealEvidenceKeys,
  computeRealMissingDataKeys,
} from "@/lib/services/commercial-intelligence/ai-analyst/hallucination-guard";
import type { AnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial com
 * IA", section 2: "não permita que a IA invente... qualquer informação
 * não presente nas fontes"). Pure-function tests — no network, no mock
 * API — proving the structural cross-check actually strips hallucinated
 * claims rather than trusting the model's own self-report.
 */
const realInput: AnalystEvidenceInput = {
  merchantListingId: "ml-1",
  title: "Secador De Cabelos Philco",
  brand: "Philco",
  categoryId: "MLB1246",
  currentPriceBrl: 149.9,
  salesEvidence: { type: "official_rank", demandScore: 70 },
  commissionEvidence: { type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 14.99, ageDays: 5, stale: false },
  priceCompetitiveness: { competitivenessScore: 90, siblingOfferCount: 3, hasConfirmedPriceDrop: true },
  qualitySignal: 80,
  trendDirection: "rising",
  matchedEventName: null,
  corroborationSourceCount: 2,
  discoverySource: "ML_GENERAL",
};

describe("computeRealEvidenceKeys / computeRealMissingDataKeys", () => {
  it("derives only the evidence genuinely present in the real input", () => {
    const keys = computeRealEvidenceKeys(realInput);
    expect(keys.has("sales_official_rank")).toBe(true);
    expect(keys.has("commission_confirmed_individual")).toBe(true);
    expect(keys.has("price_competitiveness_scored")).toBe(true);
    expect(keys.has("price_drop_confirmed")).toBe(true);
    expect(keys.has("trend_rising")).toBe(true);
    expect(keys.has("corroboration_multi_source")).toBe(true);
    expect(keys.has("trend_falling")).toBe(false); // never both directions
    expect(keys.has("matched_seasonal_event")).toBe(false); // genuinely null here
  });

  it("flags missing data honestly, never silently", () => {
    const sparse: AnalystEvidenceInput = {
      ...realInput,
      salesEvidence: { type: "unknown", demandScore: null },
      commissionEvidence: { type: "unknown", rate: null, estimatedValueBrl: null, ageDays: null, stale: false },
      priceCompetitiveness: { competitivenessScore: null, siblingOfferCount: 0, hasConfirmedPriceDrop: false },
      qualitySignal: null,
      trendDirection: null,
      corroborationSourceCount: 1,
      categoryId: null,
    };
    const missing = computeRealMissingDataKeys(sparse);
    expect(missing.has("sales_evidence_unknown")).toBe(true);
    expect(missing.has("commission_unknown")).toBe(true);
    expect(missing.has("no_sibling_offers_for_price_comparison")).toBe(true);
    expect(missing.has("quality_signal_unknown")).toBe(true);
    expect(missing.has("trend_unknown_or_new")).toBe(true);
    expect(missing.has("single_source_only")).toBe(true);
    expect(missing.has("category_unknown")).toBe(true);
  });
});

describe("validateAndSanitizeResponse — the real hallucination guard", () => {
  it("accepts a well-formed response whose evidenceUsed is genuinely backed by the real input", () => {
    const result = validateAndSanitizeResponse(
      {
        recommendation: "priorizar",
        commercialScore: 85,
        confidence: 0.8,
        favorableArguments: ["Preço competitivo frente a 3 ofertas reais."],
        risks: ["Comissão pode variar."],
        evidenceUsed: ["sales_official_rank", "price_drop_confirmed"],
        missingData: [],
      },
      realInput,
    );
    expect(result).not.toBeNull();
    expect(result!.evidenceUsed).toEqual(["sales_official_rank", "price_drop_confirmed"]);
  });

  it("strips a hallucinated evidence key the real input never actually had", () => {
    const result = validateAndSanitizeResponse(
      {
        recommendation: "priorizar",
        commercialScore: 90,
        confidence: 0.9,
        favorableArguments: ["Tendência de queda real."],
        risks: [],
        // "trend_falling" is FALSE for this input (trendDirection is "rising") — a real hallucination.
        evidenceUsed: ["sales_official_rank", "trend_falling"],
        missingData: [],
      },
      realInput,
    );
    expect(result).not.toBeNull();
    expect(result!.evidenceUsed).toEqual(["sales_official_rank"]); // trend_falling silently stripped, never trusted
  });

  it("rejects outright a response that, after stripping hallucinations, has zero real evidence left", () => {
    const result = validateAndSanitizeResponse(
      {
        recommendation: "priorizar",
        commercialScore: 95,
        confidence: 0.95,
        favorableArguments: ["Produto excelente."],
        risks: [],
        // Every one of these is fabricated relative to realInput.
        evidenceUsed: ["trend_falling", "matched_seasonal_event"],
        missingData: [],
      },
      realInput,
    );
    expect(result).toBeNull();
  });

  it("rejects a response with an invalid recommendation value", () => {
    const result = validateAndSanitizeResponse(
      { recommendation: "comprar_agora", commercialScore: 50, confidence: 0.5, favorableArguments: [], risks: [], evidenceUsed: ["sales_official_rank"], missingData: [] },
      realInput,
    );
    expect(result).toBeNull();
  });

  it("rejects a malformed response (wrong types)", () => {
    expect(validateAndSanitizeResponse({ recommendation: "observar", commercialScore: "alto" as unknown, confidence: 0.5, favorableArguments: [], risks: [], evidenceUsed: [], missingData: [] }, realInput)).toBeNull();
  });

  it("clamps commercialScore/confidence into their real valid ranges", () => {
    const result = validateAndSanitizeResponse(
      { recommendation: "observar", commercialScore: 150, confidence: 1.5, favorableArguments: [], risks: [], evidenceUsed: ["sales_official_rank"], missingData: [] },
      realInput,
    );
    expect(result?.commercialScore).toBe(100);
    expect(result?.confidence).toBe(1);
  });
});

/**
 * Owner's authorization, 2026-11-22 ("Operação Cérebro Comercial", Fase
 * A, requirement 3: "registre os motivos específicos de rejeição").
 * `validateAndSanitizeResponse` above stays accept/reject-only for its
 * existing callers/tests — these prove the DETAILED reason each specific
 * rejection path reports, which analyze-candidate.ts now surfaces as a
 * real, auditable fallbackReason instead of one generic message.
 */
describe("validateAndSanitizeResponseDetailed — specific rejection reasons", () => {
  it("reports zero_verified_evidence when every claimed key is fabricated", () => {
    const result = validateAndSanitizeResponseDetailed(
      { recommendation: "priorizar", commercialScore: 95, confidence: 0.95, favorableArguments: [], risks: [], evidenceUsed: ["trend_falling"], missingData: [] },
      realInput,
    );
    expect(result).toEqual({ ok: false, reason: "zero_verified_evidence" });
  });

  it("reports invalid_recommendation for a value outside the closed set", () => {
    const result = validateAndSanitizeResponseDetailed(
      { recommendation: "comprar_agora", commercialScore: 50, confidence: 0.5, favorableArguments: [], risks: [], evidenceUsed: ["sales_official_rank"], missingData: [] },
      realInput,
    );
    expect(result).toEqual({ ok: false, reason: "invalid_recommendation" });
  });

  it("reports invalid_commercialScore for a non-numeric score", () => {
    const result = validateAndSanitizeResponseDetailed(
      { recommendation: "observar", commercialScore: "alto" as unknown, confidence: 0.5, favorableArguments: [], risks: [], evidenceUsed: [], missingData: [] },
      realInput,
    );
    expect(result).toEqual({ ok: false, reason: "invalid_commercialScore" });
  });

  it("the EXACT real-world rejection pattern found in the 2026-11-22 controlled test: a title that sounds popular, but salesEvidence is genuinely unknown — the model must not invent sales_official_rank from the title alone", () => {
    const noSalesEvidenceInput: AnalystEvidenceInput = {
      ...realInput,
      title: "Lavadora de Alta Pressão Potente Mais Vendida — Lava Tudo",
      salesEvidence: { type: "unknown", demandScore: null },
    };
    // Even though the title screams "mais vendida", claiming
    // sales_official_rank is a hallucination — it is not in the real
    // evidence set for this input, so it must be stripped. The response
    // still has OTHER genuinely real evidence, so it is accepted, but
    // with the fabricated sales claim removed.
    const result = validateAndSanitizeResponseDetailed(
      {
        recommendation: "priorizar",
        commercialScore: 90,
        confidence: 0.9,
        favorableArguments: ["Produto muito vendido, conforme o título."],
        risks: [],
        evidenceUsed: ["sales_official_rank", "commission_confirmed_individual"],
        missingData: [],
      },
      noSalesEvidenceInput,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.evidenceUsed).toEqual(["commission_confirmed_individual"]);
      expect(result.value.evidenceUsed).not.toContain("sales_official_rank");
    }
  });
});
