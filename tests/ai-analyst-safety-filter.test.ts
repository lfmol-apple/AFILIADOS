import { describe, expect, it } from "vitest";
import { applyAnalystSafetyFilter } from "@/lib/services/commercial-intelligence/ai-analyst/safety-filter";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial
 * com IA", section 4: "não substitua o ranking inteiro... combinação
 * auditável"). Pure-function tests proving the AI is ELIMINATIVE ONLY —
 * it can remove a ranked candidate, never promote one ahead of a
 * stronger real score, and rankingScore itself is never touched.
 */
function candidate(merchantListingId: string, rankingScore: number): VitrineCandidate {
  return {
    merchantListingId,
    canonicalProductId: `cp-${merchantListingId}`,
    title: `Produto ${merchantListingId}`,
    score: rankingScore,
    rankingScore,
    group: "recorrente",
    reason: "fixture",
    scoreBreakdown: {} as VitrineCandidate["scoreBreakdown"],
    matchedEventName: null,
    matchedKeyword: null,
    commissionEvidence: { type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 10, stale: false },
    priceCompetitiveness: { score: 80, siblingOfferCount: 2, hasConfirmedPriceDrop: false },
    adPotentialHypothesis: {} as VitrineCandidate["adPotentialHypothesis"],
    categoryId: null,
    commercialAudit: { verdict: "aprovado_para_teste" } as VitrineCandidate["commercialAudit"],
    salesEvidenceType: "official_rank",
  };
}

function evaluation(merchantListingId: string, recommendation: AnalystEvaluation["recommendation"], isFallback = false): AnalystEvaluation {
  return {
    merchantListingId,
    recommendation,
    commercialScore: 70,
    confidence: 0.7,
    favorableArguments: [],
    risks: [],
    evidenceUsed: ["sales_official_rank"],
    missingData: [],
    isFallback,
    fallbackReason: null,
    model: "gpt-4o-mini",
    costUsd: 0.001,
    cached: false,
  };
}

describe("applyAnalystSafetyFilter", () => {
  it("never changes the rank order among candidates the AI does not reject", () => {
    const pool = [candidate("a", 90), candidate("b", 80), candidate("c", 70)];
    const result = applyAnalystSafetyFilter(pool, new Map(), 3);
    expect(result.picked.map((c) => c.merchantListingId)).toEqual(["a", "b", "c"]); // untouched order
    expect(result.removedByAi).toHaveLength(0);
  });

  it("removes a top-ranked candidate the AI flags 'rejeitar' and backfills from the next-best real candidate", () => {
    const pool = [candidate("a", 90), candidate("b", 80), candidate("c", 70)];
    const evaluations = new Map([["b", evaluation("b", "rejeitar")]]);
    const result = applyAnalystSafetyFilter(pool, evaluations, 2);
    expect(result.picked.map((c) => c.merchantListingId)).toEqual(["a", "c"]); // b removed, c backfilled in
    expect(result.removedByAi[0]?.candidate.merchantListingId).toBe("b");
    expect(result.backfilled.map((c) => c.merchantListingId)).toEqual(["c"]);
  });

  it("never lets the AI promote a candidate ahead of a stronger-scored one it did not reject", () => {
    const pool = [candidate("a", 90), candidate("b", 80)];
    // "priorizar" on the WEAKER candidate must never move it ahead of "a".
    const evaluations = new Map([["b", evaluation("b", "priorizar")]]);
    const result = applyAnalystSafetyFilter(pool, evaluations, 2);
    expect(result.picked.map((c) => c.merchantListingId)).toEqual(["a", "b"]); // order unchanged
  });

  it("ignores a fallback evaluation — the AI never vetoes on a non-answer", () => {
    const pool = [candidate("a", 90), candidate("b", 80)];
    const evaluations = new Map([["a", evaluation("a", "rejeitar", true)]]); // fallback, not a real evaluation
    const result = applyAnalystSafetyFilter(pool, evaluations, 2);
    expect(result.picked.map((c) => c.merchantListingId)).toEqual(["a", "b"]);
    expect(result.removedByAi).toHaveLength(0);
  });

  it("leaves a vaga deliberately empty rather than force-filling when there's no real replacement left", () => {
    const pool = [candidate("a", 90), candidate("b", 80)];
    const evaluations = new Map([["a", evaluation("a", "rejeitar")], ["b", evaluation("b", "rejeitar")]]);
    const result = applyAnalystSafetyFilter(pool, evaluations, 2);
    expect(result.picked).toHaveLength(0);
    expect(result.underCapacityReason).not.toBeNull();
  });
});
