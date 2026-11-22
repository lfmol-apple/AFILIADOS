import type { DiscardedCandidate, VitrineCandidate, VitrineGroupType } from "@/lib/services/vitrine-selection";

/**
 * Owner's directive, 2026-11-21 ("Persistir o pool avaliado"): one row
 * per candidate that reached real evaluation in a given VITRINE_RENEW
 * round, so a human can later compare the 30 selected against who
 * almost made it — something the 2026-11-21 audit found was previously
 * impossible ("a lista completa de candidatos avaliados não é
 * persistida"). Pure, DB-free row-building logic, extracted so it's
 * unit-testable without a database — jobs/vitrine-renew.ts is the ONLY
 * caller (by construction, never the simulation page or the Commercial
 * Intelligence Lab's comparison tool, both of which call
 * selectVitrineCandidates()/buildCommercialCandidatePool() directly and
 * never touch this module) — this is how "não grave simulações como
 * decisões reais" is guaranteed: structurally, not by a flag that could
 * be left unset.
 */

export type RoundFinalDecision = "SELECTED" | "RESERVE" | "DISCARDED_BY_QUOTA" | "DISCARDED";

export interface RoundCandidateRow {
  merchantListingId: string;
  groupType: VitrineGroupType | null;
  score: number | null;
  scoreBreakdown: unknown;
  commissionType: string | null;
  commissionFresh: boolean | null;
  commissionEstimatedValueBrl: number | null;
  salesEvidenceType: string | null;
  demandScore: number | null;
  trendDirection: string | null;
  eligible: boolean;
  discardReason: string | null;
  discardDetail: string | null;
  rankInGroup: number | null;
  finalDecision: RoundFinalDecision;
  justification: string;
}

/**
 * Builds every row for one round: every scored candidate (allScored —
 * selected, reserve, or cut by quota) plus every candidate discarded
 * before scoring (invalid price, ineligible, duplicate, insufficient
 * evidence, audit-rejected). `rankInGroup` is 1-based, computed from
 * `allScored`'s own order — vitrine-selection.ts already sorts each
 * group by rankingScore (desc) before flattening it into `allScored`, so
 * this never re-sorts or re-derives a ranking of its own.
 */
export function buildRoundCandidateRows(input: {
  allScored: VitrineCandidate[];
  discarded: DiscardedCandidate[];
  selectedIds: Set<string>;
  reserveIds: Set<string>;
}): RoundCandidateRow[] {
  const rows: RoundCandidateRow[] = [];
  const rankCounterByGroup = new Map<VitrineGroupType, number>();
  // Owner's requirement, 2026-11-21 ("Persistência segura do histórico"):
  // "uma rodada não gera registros duplicados". selectVitrineCandidates()
  // already guarantees a listing is never in both allScored and discarded
  // (each pool candidate either hits a `continue` into discarded, or is
  // pushed into byGroup — never both; verified directly in that file).
  // This set is a second, cheap line of defense here anyway: if that
  // upstream invariant is ever broken by a future change, the round
  // itself must still never get two rows for the same real listing.
  const seenListingIds = new Set<string>();

  for (const c of input.allScored) {
    seenListingIds.add(c.merchantListingId);
    const rank = (rankCounterByGroup.get(c.group) ?? 0) + 1;
    rankCounterByGroup.set(c.group, rank);

    const finalDecision: RoundFinalDecision = input.selectedIds.has(c.merchantListingId)
      ? "SELECTED"
      : input.reserveIds.has(c.merchantListingId)
        ? "RESERVE"
        : "DISCARDED_BY_QUOTA";

    rows.push({
      merchantListingId: c.merchantListingId,
      groupType: c.group,
      score: c.score,
      scoreBreakdown: c.scoreBreakdown,
      commissionType: c.commissionEvidence.type,
      commissionFresh: !c.commissionEvidence.stale,
      commissionEstimatedValueBrl: c.commissionEvidence.estimatedValueBrl,
      salesEvidenceType: c.salesEvidenceType,
      demandScore: c.scoreBreakdown.components.salesEvidence.value,
      trendDirection: null, // not carried on VitrineCandidate today — see scoreBreakdown.components.trend for the scored contribution instead
      eligible: true,
      discardReason: null,
      discardDetail: null,
      rankInGroup: rank,
      finalDecision,
      justification: c.reason,
    });
  }

  for (const d of input.discarded) {
    if (!d.merchantListingId) continue; // the rare family-level dedup discard with no individual listing id yet
    if (seenListingIds.has(d.merchantListingId)) continue; // defensive: already recorded via allScored, never duplicate it
    seenListingIds.add(d.merchantListingId);
    rows.push({
      merchantListingId: d.merchantListingId,
      groupType: null,
      score: null,
      scoreBreakdown: null,
      commissionType: null,
      commissionFresh: null,
      commissionEstimatedValueBrl: null,
      salesEvidenceType: null,
      demandScore: null,
      trendDirection: null,
      eligible: false,
      discardReason: d.reason,
      discardDetail: d.detail,
      rankInGroup: null,
      finalDecision: "DISCARDED",
      justification: d.detail,
    });
  }

  return rows;
}
