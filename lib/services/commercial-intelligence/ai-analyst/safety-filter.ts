import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Combines the AI Commercial Analyst with the existing deterministic
 * ranking — owner's authorization, 2026-11-22, section 4: "não substitua
 * o ranking inteiro por uma opinião do modelo... sinais comerciais
 * verificáveis + avaliação contextual da IA + regras de segurança e
 * elegibilidade." The AI is ELIMINATIVE ONLY: it can remove a
 * deterministically-ranked candidate it flags "rejeitar" (same role as
 * evaluateDescriptionQuality/auditCandidate — an additional safety gate
 * on top of an already-correct ranking), but it can NEVER promote a
 * candidate ahead of a better-scored one, and it never touches
 * rankingScore itself — zero weights changed (owner's explicit rule:
 * "não altere pesos arbitrariamente").
 *
 * `rankedPool` must already be sorted by rankingScore desc (the same
 * order pickGlobalVitrineSelection produces) — candidates beyond `limit`
 * serve only as backfill when something ahead of them is removed.
 */
export interface SafetyFilterResult {
  picked: VitrineCandidate[];
  removedByAi: { candidate: VitrineCandidate; evaluation: AnalystEvaluation }[];
  backfilled: VitrineCandidate[];
  underCapacityReason: string | null;
}

export function applyAnalystSafetyFilter(
  rankedPool: readonly VitrineCandidate[],
  evaluations: ReadonlyMap<string, AnalystEvaluation>,
  limit: number,
): SafetyFilterResult {
  const originalTopIds = new Set(rankedPool.slice(0, limit).map((c) => c.merchantListingId));
  const removedByAi: SafetyFilterResult["removedByAi"] = [];
  const backfilled: VitrineCandidate[] = [];
  const picked: VitrineCandidate[] = [];

  for (const candidate of rankedPool) {
    if (picked.length >= limit) break;
    const evaluation = evaluations.get(candidate.merchantListingId);
    // No real evaluation available (never evaluated, or a fallback) —
    // the AI never gets to veto on a non-answer; the deterministic
    // ranking stands as-is for this candidate.
    if (evaluation && !evaluation.isFallback && evaluation.recommendation === "rejeitar") {
      removedByAi.push({ candidate, evaluation });
      continue;
    }
    if (!originalTopIds.has(candidate.merchantListingId)) {
      backfilled.push(candidate);
    }
    picked.push(candidate);
  }

  return {
    picked,
    removedByAi,
    backfilled,
    underCapacityReason:
      picked.length < limit
        ? `A IA rejeitou ${removedByAi.length} candidato(s) e não havia substituto(s) suficiente(s) já avaliado(s) para preencher as ${limit} vagas — vagas deixadas vazias deliberadamente, nunca preenchidas artificialmente.`
        : null,
  };
}
