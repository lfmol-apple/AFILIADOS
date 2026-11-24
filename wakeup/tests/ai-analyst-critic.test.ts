import { describe, expect, it } from "vitest";
import { runCriticalReview } from "@/lib/services/commercial-intelligence/ai-analyst/critic";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial
 * com IA", section 6 — "IA Crítica"). Pure-function tests — deterministic,
 * no mocked API, matching the module's own design (a second LLM call
 * would risk exactly the "duas IAs concordando automaticamente" the
 * owner warned against).
 */
function candidate(id: string, categoryId: string | null, opts: Partial<VitrineCandidate> = {}): VitrineCandidate {
  return {
    merchantListingId: id,
    canonicalProductId: `cp-${id}`,
    title: `Produto ${id}`,
    score: 50,
    rankingScore: 50,
    group: "recorrente",
    reason: "fixture",
    scoreBreakdown: {} as VitrineCandidate["scoreBreakdown"],
    matchedEventName: null,
    matchedKeyword: null,
    commissionEvidence: { type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 10, stale: false },
    priceCompetitiveness: { score: 80, siblingOfferCount: 2, hasConfirmedPriceDrop: false },
    adPotentialHypothesis: {} as VitrineCandidate["adPotentialHypothesis"],
    categoryId,
    commercialAudit: { verdict: "aprovado_para_teste" } as VitrineCandidate["commercialAudit"],
    salesEvidenceType: "official_rank",
    ...opts,
  };
}

function evaluation(id: string, evidenceUsed: AnalystEvaluation["evidenceUsed"], missingData: AnalystEvaluation["missingData"] = []): AnalystEvaluation {
  return {
    merchantListingId: id,
    recommendation: "observar",
    commercialScore: 60,
    confidence: 0.6,
    favorableArguments: [],
    risks: [],
    evidenceUsed,
    missingData,
    isFallback: false,
    fallbackReason: null,
    model: "gpt-4o-mini",
    costUsd: 0.001,
    cached: false,
  };
}

describe("runCriticalReview", () => {
  it("returns no findings for a well-diversified, well-evidenced selection", () => {
    const picked = [candidate("a", "MLB1051"), candidate("b", "MLB1000"), candidate("c", "MLB5726")];
    const evaluations = new Map([
      ["a", evaluation("a", ["sales_official_rank", "price_competitiveness_scored"])],
      ["b", evaluation("b", ["commission_confirmed_individual", "quality_signal_present"])],
      ["c", evaluation("c", ["trend_rising"])],
    ]);
    expect(runCriticalReview(picked, evaluations)).toHaveLength(0);
  });

  it("flags real category concentration above the real threshold", () => {
    const picked = [candidate("a", "MLB5726"), candidate("b", "MLB5726"), candidate("c", "MLB5726"), candidate("d", "MLB5726"), candidate("e", "MLB1000")];
    const findings = runCriticalReview(picked, new Map());
    const found = findings.find((f) => f.issue === "concentracao_de_categoria");
    expect(found).toBeDefined();
    expect(found?.affectedListingIds).toHaveLength(4);
  });

  it("flags a selection leaning heavily on stale commission data", () => {
    const picked = [
      candidate("a", "MLB1", { commissionEvidence: { type: "historical", rate: 0.1, estimatedValueBrl: 5, stale: true } }),
      candidate("b", "MLB2", { commissionEvidence: { type: "historical", rate: 0.1, estimatedValueBrl: 5, stale: true } }),
      candidate("c", "MLB3", { commissionEvidence: { type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 10, stale: false } }),
    ];
    const findings = runCriticalReview(picked, new Map());
    expect(findings.some((f) => f.issue === "comissao_predominantemente_desatualizada")).toBe(true);
  });

  it("flags recurring missing data across real AI evaluations, not a one-off", () => {
    const picked = [candidate("a", "MLB1"), candidate("b", "MLB2"), candidate("c", "MLB3")];
    const evaluations = new Map([
      ["a", evaluation("a", ["sales_official_rank"], ["commission_unknown"])],
      ["b", evaluation("b", ["sales_official_rank"], ["commission_unknown"])],
      ["c", evaluation("c", ["price_competitiveness_scored"], [])],
    ]);
    const findings = runCriticalReview(picked, evaluations);
    const found = findings.find((f) => f.issue === "lacunas_de_dados_recorrentes");
    expect(found?.affectedListingIds).toEqual(["a", "b"]);
  });

  it("flags when every real AI evaluation leans on the exact same single evidence key — low diversity of reasoning", () => {
    const picked = [candidate("a", "MLB1"), candidate("b", "MLB2"), candidate("c", "MLB3")];
    const evaluations = new Map([
      ["a", evaluation("a", ["sales_official_rank"])],
      ["b", evaluation("b", ["sales_official_rank"])],
      ["c", evaluation("c", ["sales_official_rank"])],
    ]);
    const findings = runCriticalReview(picked, evaluations);
    expect(findings.some((f) => f.issue === "baixa_diversidade_de_evidencia")).toBe(true);
  });

  it("ignores fallback evaluations — they carry no real signal to critique", () => {
    const picked = [candidate("a", "MLB1")];
    const evaluations = new Map([["a", { ...evaluation("a", []), isFallback: true }]]);
    expect(runCriticalReview(picked, evaluations)).toHaveLength(0);
  });
});
