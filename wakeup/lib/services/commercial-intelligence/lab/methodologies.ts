import type { PooledCandidate, VitrineCandidate } from "@/lib/services/vitrine-selection";
import { calculateVitrineScoreLegacyV2 } from "@/lib/services/commercial-intelligence/legacy/vitrine-score-v2-frozen";
import { toAnalystEvidenceInput } from "@/lib/services/commercial-intelligence/ai-analyst/candidate-adapter";
import { analyzeCandidates } from "@/lib/services/commercial-intelligence/ai-analyst/analyze-candidate";
import { applyAnalystSafetyFilter } from "@/lib/services/commercial-intelligence/ai-analyst/safety-filter";
import { applyPriorityAdjustment, type PriorityAdjustment } from "@/lib/services/commercial-intelligence/ai-analyst/priority-adjustment";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Commercial Intelligence Lab — four methodologies, owner's authorization
 * 2026-11-19. Three of these (official_rank_only, commission_only,
 * multifactor_v3) are ranked from the EXACT SAME shared candidate pool
 * (buildCommercialCandidatePool in vitrine-selection.ts) — true "mesmo
 * universo de candidatos, mesma data de referência, mesmos critérios
 * mínimos de elegibilidade" (owner's requirement). legacy_v2 is the one
 * exception, documented as a real limitation below.
 */
/**
 * Owner's authorization, 2026-11-19 ("Aprovação condicionada", section 6):
 * five methodologies now — A (official_rank_only), B (panel_recommended,
 * NEW: real ML affiliate panel sections, read live the same day — see
 * data/ml-panel-reads/hub-*-2026-11-19.json and scripts/
 * ml-panel-live-ingest.ts), C (commission_current_only, REPLACES the old
 * commission_only: only confirmed_individual/promotional_temporary rates
 * count — "vigente e confirmada", historical/category_tier excluded),
 * D (legacy_v2), E (multifactor_v3). The old `commission_only` baseline
 * is KEPT (never deleted — "preserve os resultados anteriores para
 * comparações históricas") alongside the new, stricter one.
 */
export type LabMethodology =
  | "official_rank_only"
  | "panel_recommended"
  | "commission_only"
  | "commission_current_only"
  | "legacy_v2"
  | "multifactor_v3"
  | "ai_assisted_v1";

export const LAB_METHODOLOGY_LABELS: Record<LabMethodology, string> = {
  official_rank_only: "A — Ranking oficial de vendas (Mercado Livre)",
  panel_recommended: "B — Recomendados pelo painel de afiliados",
  commission_only: "Só maior comissão potencial em reais (histórico incluído, baseline anterior)",
  commission_current_only: "C — Maior comissão vigente e confirmada (exclui histórico)",
  legacy_v2: "D — Algoritmo anterior às correções (congelado, commit 1cbf7e6)",
  multifactor_v3: "E — Inteligência comercial multifatorial (atual)",
  ai_assisted_v1: "F — Multifatorial + Analista Comercial de IA (filtro eliminativo, 2026-11-22)",
};

export const ALGORITHM_VERSIONS: Record<LabMethodology, string> = {
  official_rank_only: "baseline-v1",
  panel_recommended: "baseline-v1",
  commission_only: "baseline-v1",
  commission_current_only: "baseline-v1",
  legacy_v2: "1cbf7e6",
  multifactor_v3: "v3-2026-11-19",
  ai_assisted_v1: "ai-v1-2026-11-22",
};

export interface LabRankedItem {
  merchantListingId: string;
  title: string;
  rank: number;
  /** The single number this methodology actually sorted by — never the
   * multifactor score itself for the two single-criterion baselines
   * (owner's explicit rule: "não utilize a própria pontuação do
   * algoritmo como comprovação de sua superioridade" — this field says
   * what each methodology optimizes for, kept separate from any later
   * independent outcome measurement). */
  criterionValue: number | null;
  discoverySource: string | null;
  evidenceSnapshot: Record<string, unknown>;
}

function toEvidenceSnapshot(c: PooledCandidate): Record<string, unknown> {
  return {
    currentPrice: c.currentPrice,
    salesEvidence: c.salesEvidence,
    commissionEvidence: c.commissionEvidence,
    priceCompetitiveness: {
      score: c.priceCompetitiveness.competitivenessScore,
      siblingOfferCount: c.priceCompetitiveness.siblingOfferCount,
      hasConfirmedPriceDrop: c.priceCompetitiveness.hasConfirmedPriceDrop,
    },
    matchedEventName: c.matchedEvent?.event.name ?? null,
    matchedKeyword: c.matchedKeyword,
    trendDirection: c.trendDirection,
  };
}

/** Ranks purely by real official bestseller-rank evidence — excludes
 * anything whose "sales evidence" is actually search relevance or
 * unknown (a pure ranking criterion has nothing to rank those on). */
export function rankByOfficialRankOnly(pool: readonly PooledCandidate[], limit: number): LabRankedItem[] {
  return pool
    .filter((c) => c.salesEvidence.type === "official_rank" && c.salesEvidence.demandScore !== null)
    .sort((a, b) => b.salesEvidence.demandScore! - a.salesEvidence.demandScore!)
    .slice(0, limit)
    .map((c, i) => ({
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: c.salesEvidence.demandScore,
      discoverySource: c.discoverySource,
      evidenceSnapshot: toEvidenceSnapshot(c),
    }));
}

/** B — real recommendations from the Mercado Livre affiliate panel itself
 * (owner's authorization, section 6: "produtos recomendados pelo próprio
 * painel de afiliados"), identified by this exact listing having at
 * least one `panel_bestseller`, `panel_recommended`,
 * `panel_extra_commission` or `panel_offered_commission` entry in the
 * CommercialCandidateRegistry (corroboration.sources) — i.e. the panel
 * itself surfaced it, independent of anything our own ranking/sales
 * evidence says. Ordered by salesEvidence purely as a deterministic tie-
 * break, never as proof this methodology is good or bad — the point of
 * this methodology is to show what the PANEL recommends, as-is. */
export function rankByPanelRecommended(pool: readonly PooledCandidate[], limit: number): LabRankedItem[] {
  const PANEL_SOURCES = new Set(["panel_bestseller", "panel_recommended", "panel_extra_commission", "panel_offered_commission"]);
  return pool
    .filter((c) => c.corroboration.sources.some((s) => PANEL_SOURCES.has(s)))
    .sort((a, b) => (b.salesEvidence.demandScore ?? 0) - (a.salesEvidence.demandScore ?? 0))
    .slice(0, limit)
    .map((c, i) => ({
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: null,
      discoverySource: c.discoverySource,
      evidenceSnapshot: { ...toEvidenceSnapshot(c), panelSources: c.corroboration.sources.filter((s) => PANEL_SOURCES.has(s)) },
    }));
}

/** C — commission "vigente e confirmada" only (owner's correction,
 * section 6: distinct from the OLD commission_only baseline below, which
 * accepted ANY individual rate including stale historical ones).
 * Excludes `historical` and `category_tier` entirely — a candidate here
 * either has a fresh (<=45-day) individual observation or an active
 * promotional "ganhos extras" rate, never a number from September
 * presented as current. */
export function rankByCurrentCommissionOnly(pool: readonly PooledCandidate[], limit: number): LabRankedItem[] {
  return pool
    .filter((c) => (c.commissionEvidence.type === "confirmed_individual" || c.commissionEvidence.type === "promotional_temporary") && c.commissionEvidence.estimatedValueBrl !== null)
    .sort((a, b) => b.commissionEvidence.estimatedValueBrl! - a.commissionEvidence.estimatedValueBrl!)
    .slice(0, limit)
    .map((c, i) => ({
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: c.commissionEvidence.estimatedValueBrl,
      discoverySource: c.discoverySource,
      evidenceSnapshot: toEvidenceSnapshot(c),
    }));
}

/** Ranks purely by estimated commission value in reais — excludes
 * anything with no confirmed commission evidence. Kept as the original
 * baseline for historical comparison (owner's explicit rule: "preserve
 * os resultados anteriores") — rankByCurrentCommissionOnly above is the
 * new, stricter "vigente e confirmada" methodology C. */
export function rankByCommissionOnly(pool: readonly PooledCandidate[], limit: number): LabRankedItem[] {
  return pool
    .filter((c) => c.commissionEvidence.estimatedValueBrl !== null)
    .sort((a, b) => b.commissionEvidence.estimatedValueBrl! - a.commissionEvidence.estimatedValueBrl!)
    .slice(0, limit)
    .map((c, i) => ({
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: c.commissionEvidence.estimatedValueBrl,
      discoverySource: c.discoverySource,
      evidenceSnapshot: toEvidenceSnapshot(c),
    }));
}

/** Ranks by the NEW multifactor rankingScore — same pool, same gates,
 * the Vitrine's own current methodology. */
export function rankByMultifactorV3(
  pool: readonly PooledCandidate[],
  limit: number,
  scoreByListingId: Map<string, number>,
): LabRankedItem[] {
  return [...pool]
    .filter((c) => scoreByListingId.has(c.merchantListingId))
    .sort((a, b) => scoreByListingId.get(b.merchantListingId)! - scoreByListingId.get(a.merchantListingId)!)
    .slice(0, limit)
    .map((c, i) => ({
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: scoreByListingId.get(c.merchantListingId) ?? null,
      discoverySource: c.discoverySource,
      evidenceSnapshot: toEvidenceSnapshot(c),
    }));
}

/**
 * F — multifactorial ranking (rankByMultifactorV3's SAME order, same
 * weights, nothing changed) + the AI Commercial Analyst as a bounded,
 * two-stage layer on top (owner's authorization, 2026-11-22, "Motor de
 * Inteligência Comercial com IA", section 4: "não substitua o ranking
 * inteiro por uma opinião do modelo"; reconnected 2026-11-23, "Operação
 * Cérebro Comercial" — the real root cause this closes: applyPriorityAdjustment
 * was built and tested in Fase E but never called from here, so every
 * ai_assisted_v1 run before this fix was, in practice, indistinguishable
 * from multifactor_v3). Only the extended candidate pool (limit + buffer)
 * is ever sent to the AI — never the whole universe — bounding real cost
 * to a few dozen cheap text-model calls per run, cached per (listing,
 * evidence) so an unchanged candidate is never re-evaluated.
 *
 * Exact sequence (owner's required order, 2026-11-23, item 1 — each
 * stage strictly after the previous one, so a later stage never silently
 * undoes an earlier one):
 *   1. Deterministic ranking — `extendedRankedPool`, already computed by
 *      multifactor_v3 + pickGlobalVitrineSelection before this function
 *      is ever called.
 *   2. Real AI evaluations — `analyzeCandidates` (reuses a persisted
 *      evaluation per (listing, evidence) when one already exists; never
 *      forces a new paid call here).
 *   3. Safety filter — `applyAnalystSafetyFilter` (ELIMINATION only: can
 *      remove a "rejeitar" candidate and backfill from the buffer, never
 *      reorders).
 *   4. Priority adjustment — `applyPriorityAdjustment` (bounded, capped
 *      promotion for a confident "priorizar" with real evidence; a
 *      revisao_necessaria candidate's own weight is forced to 0, so it
 *      can be displaced but never be the one rising — see that
 *      function's own doc comment).
 *   5. Commercial audit — already baked into each VitrineCandidate's
 *      `commercialAudit` field by vitrine-selection.ts, BEFORE this
 *      function ever runs (a `reprovado` candidate is discarded there
 *      and never reaches this pool at all — structurally impossible to
 *      promote one here). Step 4 reads that verdict; nothing after step
 *      4 recomputes or overrides it.
 *   6/7/8. Final eligibility, snapshot persistence and engine consumption
 *      happen entirely OUTSIDE this function — `order` below (not
 *      `picked`) is what run-comparison.ts must persist as the final
 *      ranked `items`, which is what jobs/vitrine-renew.ts's
 *      validated-ai-selection.ts reads back.
 *
 * Never calls the real API without a configured key/budget — see
 * analyzeCandidate's own fallback contract (always "observar", never
 * silently indistinguishable from a real evaluation). A fallback never
 * vetoes anything (safety-filter.ts) and never earns a priority
 * adjustment either (priorityWeight returns 0 for a fallback), so
 * running this methodology with no AI configured degrades EXACTLY to
 * multifactor_v3, never to an error or a different ranking.
 */
export async function rankByAiAssisted(
  extendedRankedPool: readonly VitrineCandidate[],
  pool: readonly PooledCandidate[],
  limit: number,
): Promise<{
  items: LabRankedItem[];
  evaluations: AnalystEvaluation[];
  /** Post-safety-filter, PRE-priority-adjustment order — kept only for
   * callers that need the raw elimination result (e.g. a before/after
   * comparison); never what gets persisted as the final ranked order. */
  picked: VitrineCandidate[];
  /** The actual final order — post safety-filter AND post priority-
   * adjustment. This is what `items`' `rank` field reflects, and what
   * any caller building the real, applied ai_assisted_v1 selection must
   * use. */
  order: VitrineCandidate[];
  priorityAdjustments: PriorityAdjustment[];
  evaluationsByListing: Map<string, AnalystEvaluation>;
}> {
  // Looks up each candidate's REAL PooledCandidate (price, full evidence
  // objects) by id — never fabricates a value VitrineCandidate alone
  // doesn't carry (it has no price field at all). A candidate genuinely
  // missing from the pool (should not happen — both come from the same
  // buildCommercialCandidatePool() run) is skipped, never given a
  // placeholder price.
  const poolByListingId = new Map(pool.map((c) => [c.merchantListingId, c]));
  const evidenceInputs = extendedRankedPool
    .map((c) => poolByListingId.get(c.merchantListingId))
    .filter((c): c is PooledCandidate => c !== undefined)
    .map(toAnalystEvidenceInput);
  const evaluations = await analyzeCandidates(evidenceInputs);
  const evaluationsByListing = new Map(evaluations.map((e) => [e.merchantListingId, e]));

  const { picked } = applyAnalystSafetyFilter(extendedRankedPool, evaluationsByListing, limit);
  const { order, adjustments: priorityAdjustments } = applyPriorityAdjustment(picked, evaluationsByListing);

  const items: LabRankedItem[] = order.map((c, i) => {
    const adjustment = priorityAdjustments.find((a) => a.merchantListingId === c.merchantListingId) ?? null;
    return {
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: c.rankingScore,
      discoverySource: null,
      evidenceSnapshot: {
        rankingScore: c.rankingScore,
        aiEvaluation: evaluationsByListing.get(c.merchantListingId) ?? null,
        // Owner's authorization, 2026-11-23 (item 2, "sinalização... para
        // revisao_necessaria"): the persisted record must show WHICH
        // verdict each item carries — a human reading the snapshot must
        // never have to re-derive this from elsewhere to notice a
        // pending-review item sitting in the final selection.
        commercialAuditVerdict: c.commercialAudit.verdict,
        commercialAuditRisks: c.commercialAudit.risks,
        commissionEvidenceType: c.commissionEvidence.type,
        priorityAdjustment: adjustment,
      },
    };
  });

  return { items, evaluations, picked, order, priorityAdjustments, evaluationsByListing };
}

/**
 * The pre-correction algorithm (frozen 2026-11-19), re-run against the
 * SAME pool for ranking purposes — NOT a fully independent query like the
 * real historical run was (that queried/deduped on its own, with none of
 * today's gates). This is a documented, deliberate simplification: v2's
 * OWN scoring formula (bestsellerRankToScore misapplied to search
 * positions, saturating commissionToScore — real MonetizationScoreComponents
 * input, unchanged) is reapplied to each pooled candidate's ALREADY-GATED
 * data, so the comparison isolates "how would the OLD scoring formula
 * have ranked these same real candidates" rather than re-litigating
 * dedup/eligibility differences too. v2's seasonality input is also
 * reused as-is (seasonalWeight), but note v2 had no thematic/promotional
 * distinction — every matched event counted the same way.
 */
export function rankByLegacyV2(pool: readonly PooledCandidate[], limit: number): LabRankedItem[] {
  const scored = pool.map((c) => {
    const legacyScore = calculateVitrineScoreLegacyV2({
      monetization: c.monetizationComponents,
      seasonalEvent: c.matchedEvent,
      trendDirection: c.trendDirection,
      vitrineClickCount: c.vitrineClickCount,
    });
    // v2 had no rankingScore field (that fix landed after this commit) —
    // score × confidence reproduces what it would have ranked by, had it
    // had one.
    return { candidate: c, legacyScore: legacyScore.score * legacyScore.confidence };
  });
  return scored
    .sort((a, b) => b.legacyScore - a.legacyScore)
    .slice(0, limit)
    .map(({ candidate: c }, i) => ({
      merchantListingId: c.merchantListingId,
      title: c.title,
      rank: i + 1,
      criterionValue: scored.find((s) => s.candidate.merchantListingId === c.merchantListingId)?.legacyScore ?? null,
      discoverySource: c.discoverySource,
      evidenceSnapshot: toEvidenceSnapshot(c),
    }));
}
