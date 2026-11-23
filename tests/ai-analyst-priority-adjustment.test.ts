import { describe, expect, it } from "vitest";
import { applyPriorityAdjustment } from "@/lib/services/commercial-intelligence/ai-analyst/priority-adjustment";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";
import type { CommissionEvidenceType } from "@/lib/services/commercial-intelligence/commission-evidence";
import type { AuditVerdict } from "@/lib/services/commercial-intelligence/commercial-audit";

/**
 * Owner's authorization, 2026-11-22 ("Operação Cérebro Comercial", Fase
 * E, item 2): bounded, auditable re-ordering — never arbitrary, never
 * crossing the commission-confidence ceiling, never moved by "observar"
 * alone. Extended 2026-11-23 (item 2 of the follow-up: "revisao_necessaria
 * pode permanecer como candidato, mas deve receber restrições
 * proporcionais à gravidade das lacunas") — a candidate the commercial
 * audit hasn't confirmed can never be the one promoted.
 */
function candidate(id: string, commissionType: CommissionEvidenceType, auditVerdict: AuditVerdict = "aprovado_para_teste"): VitrineCandidate {
  return {
    merchantListingId: id,
    title: id,
    commissionEvidence: { type: commissionType, rate: null, capturedAt: null, ageDays: null, stale: false, estimatedValueBrl: null, source: "" },
    commercialAudit: { verdict: auditVerdict, reasons: [], risks: [] },
  } as unknown as VitrineCandidate;
}

function evaluation(overrides: Partial<AnalystEvaluation>): AnalystEvaluation {
  return {
    merchantListingId: "x",
    recommendation: "observar",
    commercialScore: 0,
    confidence: 0,
    favorableArguments: [],
    risks: [],
    evidenceUsed: [],
    missingData: [],
    isFallback: false,
    fallbackReason: null,
    model: "gpt-4o-mini",
    costUsd: 0.0002,
    cached: false,
    ...overrides,
  };
}

describe("applyPriorityAdjustment", () => {
  it("never moves anything when every evaluation is 'observar' (no explicit confident endorsement)", () => {
    const pool = [candidate("a", "unknown"), candidate("b", "unknown"), candidate("c", "unknown")];
    const evals = new Map(pool.map((c) => [c.merchantListingId, evaluation({ merchantListingId: c.merchantListingId, recommendation: "observar", confidence: 0.9 })]));
    const result = applyPriorityAdjustment(pool, evals);
    expect(result.adjustments).toHaveLength(0);
    expect(result.order.map((c) => c.merchantListingId)).toEqual(["a", "b", "c"]);
  });

  it("never moves anything when the evaluation is a fallback, even if recommendation looks like 'priorizar' text", () => {
    const pool = [candidate("a", "unknown"), candidate("b", "unknown")];
    const evals = new Map([["b", evaluation({ merchantListingId: "b", recommendation: "priorizar", confidence: 0.9, isFallback: true })]]);
    const result = applyPriorityAdjustment(pool, evals);
    expect(result.adjustments).toHaveLength(0);
  });

  it("lets a confident, evidence-backed 'priorizar' rise past weaker neighbors with the SAME commission tier", () => {
    const pool = [candidate("a", "unknown"), candidate("b", "unknown"), candidate("c", "unknown")];
    const evals = new Map([
      ["c", evaluation({ merchantListingId: "c", recommendation: "priorizar", confidence: 0.95, evidenceUsed: ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed"] as never })],
    ]);
    const result = applyPriorityAdjustment(pool, evals);
    expect(result.order[0]!.merchantListingId).toBe("c");
    const adj = result.adjustments.find((a) => a.merchantListingId === "c")!;
    expect(adj.originalRank).toBe(3);
    expect(adj.adjustedRank).toBe(1);
  });

  it("NEVER lets unknown commission leapfrog a candidate with confirmed_individual commission, no matter the AI confidence", () => {
    const pool = [candidate("confirmed", "confirmed_individual"), candidate("unknown", "unknown")];
    const evals = new Map([
      ["unknown", evaluation({ merchantListingId: "unknown", recommendation: "priorizar", confidence: 1, evidenceUsed: ["sales_official_rank", "price_competitiveness_scored"] as never })],
    ]);
    const result = applyPriorityAdjustment(pool, evals);
    // "unknown" wanted to rise, but "confirmed" has strictly better commission trust — the ceiling holds.
    expect(result.order.map((c) => c.merchantListingId)).toEqual(["confirmed", "unknown"]);
    expect(result.adjustments).toHaveLength(0);
  });

  it("caps the rise at MAX_RANK_SHIFT (5) positions even with maximum confidence and evidence", () => {
    const pool = Array.from({ length: 10 }, (_, i) => candidate(`c${i}`, "unknown"));
    const evals = new Map([
      ["c9", evaluation({ merchantListingId: "c9", recommendation: "priorizar", confidence: 1, evidenceUsed: ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed", "quality_signal_present", "corroboration_multi_source"] as never })],
    ]);
    const result = applyPriorityAdjustment(pool, evals);
    const newIndex = result.order.findIndex((c) => c.merchantListingId === "c9");
    expect(newIndex).toBe(10 - 1 - 5); // rose exactly 5 positions, never more
  });

  it("gives a displaced candidate (pushed down by a neighbor's rise) its OWN real reason, never claiming it was recommended 'priorizar' itself", () => {
    const pool = [candidate("riser", "unknown"), candidate("displaced", "unknown")];
    const evals = new Map([
      ["riser", evaluation({ merchantListingId: "riser", recommendation: "priorizar", confidence: 0.8, evidenceUsed: ["sales_official_rank"] as never })],
      ["displaced", evaluation({ merchantListingId: "displaced", recommendation: "observar", confidence: 0.9 })],
    ]);
    // "riser" starts behind "displaced" so it rises past it.
    const result = applyPriorityAdjustment([candidate("displaced", "unknown"), candidate("riser", "unknown")], evals);
    const displacedAdj = result.adjustments.find((a) => a.merchantListingId === "displaced")!;
    expect(displacedAdj.rankDelta).toBeLessThan(0);
    expect(displacedAdj.reason).not.toContain('subiu por recomendação "priorizar"');
    expect(displacedAdj.reason).toContain('"observar"');
    const riserAdj = result.adjustments.find((a) => a.merchantListingId === "riser")!;
    expect(riserAdj.reason).toContain('recomendação "priorizar"');
  });

  it("never changes membership — same candidates in, same candidates out", () => {
    const pool = [candidate("a", "unknown"), candidate("b", "historical"), candidate("c", "confirmed_individual")];
    const evals = new Map([["b", evaluation({ merchantListingId: "b", recommendation: "priorizar", confidence: 0.8, evidenceUsed: ["sales_official_rank"] as never })]]);
    const result = applyPriorityAdjustment(pool, evals);
    expect(new Set(result.order.map((c) => c.merchantListingId))).toEqual(new Set(["a", "b", "c"]));
  });

  it("NEVER promotes a revisao_necessaria candidate, even with a maximally confident 'priorizar' and strong evidence", () => {
    const pool = [
      candidate("aprovado", "unknown", "aprovado_para_teste"),
      candidate("pendente", "unknown", "revisao_necessaria"),
    ];
    const evals = new Map([
      ["pendente", evaluation({ merchantListingId: "pendente", recommendation: "priorizar", confidence: 1, evidenceUsed: ["sales_official_rank", "price_competitiveness_scored", "price_drop_confirmed"] as never })],
    ]);
    const result = applyPriorityAdjustment(pool, evals);
    expect(result.order.map((c) => c.merchantListingId)).toEqual(["aprovado", "pendente"]);
    expect(result.adjustments).toHaveLength(0);
  });

  it("a revisao_necessaria candidate CAN still be displaced downward by a confident neighbor rising past it", () => {
    const pool = [
      candidate("pendente", "unknown", "revisao_necessaria"),
      candidate("riser", "unknown", "aprovado_para_teste"),
    ];
    const evals = new Map([
      ["riser", evaluation({ merchantListingId: "riser", recommendation: "priorizar", confidence: 0.9, evidenceUsed: ["sales_official_rank"] as never })],
    ]);
    const result = applyPriorityAdjustment(pool, evals);
    expect(result.order.map((c) => c.merchantListingId)).toEqual(["riser", "pendente"]);
    const displaced = result.adjustments.find((a) => a.merchantListingId === "pendente")!;
    expect(displaced.rankDelta).toBeLessThan(0);
  });
});
