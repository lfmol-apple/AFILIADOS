import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";
import type { CommissionEvidenceType } from "@/lib/services/commercial-intelligence/commission-evidence";

/**
 * Bounded, auditable priority adjustment — owner's authorization,
 * 2026-11-22 ("Operação Cérebro Comercial", Fase E, item 2): "a IA pode
 * influenciar a ordem dos candidatos, mas não por uma nota arbitrária...
 * não permita que a IA supere critérios determinísticos de
 * elegibilidade... não transforme uma comissão desconhecida em comissão
 * estimada artificialmente... não promova produtos apenas porque
 * receberam notas altas do modelo."
 *
 * This runs strictly AFTER applyAnalystSafetyFilter (safety-filter.ts) —
 * it only re-orders candidates that already survived elimination; it
 * never adds, removes, or re-evaluates eligibility. Every adjustment is
 * capped at MAX_RANK_SHIFT positions from the deterministic rank
 * (multifactor_v3's own rankingScore order), so the AI can nudge, never
 * overrule, the underlying ranking. A candidate's commission tier acts
 * as a hard ceiling on how far it can rise — unknown or historical
 * commission can never leapfrog a candidate with fresher, more reliable
 * commission evidence, regardless of how confident the AI's recommendation
 * is. Disableable: a caller that never calls this function gets the
 * original deterministic order, unchanged (no global flag needed — this
 * module has no side effects and is opt-in by import).
 */

const MAX_RANK_SHIFT = 5;

/** Lower = more trustworthy. A candidate may never rise above a
 * candidate whose commission tier is strictly more trustworthy, no
 * matter the AI score — this is the hard ceiling the owner required. */
const COMMISSION_TIER_RANK: Record<CommissionEvidenceType, number> = {
  confirmed_individual: 0,
  promotional_temporary: 1,
  historical: 2,
  category_tier: 3,
  unknown: 4,
};

export interface PriorityAdjustment {
  merchantListingId: string;
  originalRank: number;
  adjustedRank: number;
  rankDelta: number;
  /** Real, auditable factors behind the delta — never a bare number. */
  reason: string;
}

export interface PriorityAdjustmentResult {
  order: VitrineCandidate[];
  adjustments: PriorityAdjustment[];
}

/** A candidate's real, bounded priority signal — 0 when there's no real
 * evaluation to act on (a fallback never influences order), otherwise a
 * small, explainable number: how confidently "priorizar" was recommended,
 * scaled down by how little real evidence backs it. Never a bare
 * commercialScore — that field is explicitly "informational only" per
 * types.ts and the lab's own doc comment. */
function priorityWeight(evaluation: AnalystEvaluation | undefined): number {
  if (!evaluation || evaluation.isFallback) return 0;
  if (evaluation.recommendation !== "priorizar") return 0; // "observar" never pushes order — only an explicit, confident endorsement does
  const evidenceStrength = Math.min(evaluation.evidenceUsed.length, 5) / 5; // 0..1
  return evaluation.confidence * evidenceStrength;
}

/**
 * Re-orders an already-safety-filtered, deterministically-ranked list.
 * `rankedPool` must be in the SAME order applyAnalystSafetyFilter
 * returned (`picked`) — this never changes membership, only position,
 * and only within MAX_RANK_SHIFT of each candidate's original index.
 */
export function applyPriorityAdjustment(
  rankedPool: readonly VitrineCandidate[],
  evaluations: ReadonlyMap<string, AnalystEvaluation>,
): PriorityAdjustmentResult {
  const working = rankedPool.map((candidate, index) => ({
    candidate,
    originalRank: index,
    commissionTier: COMMISSION_TIER_RANK[candidate.commissionEvidence.type as CommissionEvidenceType] ?? COMMISSION_TIER_RANK.unknown,
    weight: priorityWeight(evaluations.get(candidate.merchantListingId)),
  }));

  const result = [...working];

  // Bubble a candidate up at most MAX_RANK_SHIFT positions, one swap at a
  // time, and ONLY past a neighbor whose commission tier is not strictly
  // more trustworthy — this is what makes "unknown commission can never
  // out-rank confirmed commission" a hard, mechanical guarantee rather
  // than a hope.
  for (let i = result.length - 1; i > 0; i--) {
    const current = result[i]!;
    if (current.weight <= 0) continue;
    let target = i;
    while (
      target > 0 &&
      target > current.originalRank - MAX_RANK_SHIFT &&
      result[target - 1]!.weight < current.weight &&
      result[target - 1]!.commissionTier >= current.commissionTier
    ) {
      target -= 1;
    }
    if (target !== i) {
      result.splice(i, 1);
      result.splice(target, 0, current);
    }
  }

  const adjustments: PriorityAdjustment[] = [];
  const order: VitrineCandidate[] = [];
  result.forEach((entry, newIndex) => {
    order.push(entry.candidate);
    const delta = entry.originalRank - newIndex;
    if (delta !== 0) {
      const evaluation = evaluations.get(entry.candidate.merchantListingId);
      adjustments.push({
        merchantListingId: entry.candidate.merchantListingId,
        originalRank: entry.originalRank + 1,
        adjustedRank: newIndex + 1,
        rankDelta: delta,
        reason: `recomendação "priorizar" com confiança ${evaluation?.confidence ?? 0} e ${evaluation?.evidenceUsed.length ?? 0} evidência(s) real(is) verificada(s); comissão: ${entry.candidate.commissionEvidence.type}.`,
      });
    }
  });

  return { order, adjustments };
}
