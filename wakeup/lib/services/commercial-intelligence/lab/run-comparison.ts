import { prisma } from "@/lib/db";
import { buildCommercialCandidatePool, selectVitrineCandidates, pickGlobalVitrineSelection } from "@/lib/services/vitrine-selection";
import {
  rankByOfficialRankOnly,
  rankByPanelRecommended,
  rankByCommissionOnly,
  rankByCurrentCommissionOnly,
  rankByLegacyV2,
  rankByMultifactorV3,
  rankByAiAssisted,
  ALGORITHM_VERSIONS,
  type LabMethodology,
  type LabRankedItem,
} from "@/lib/services/commercial-intelligence/lab/methodologies";
import { runCriticalReview } from "@/lib/services/commercial-intelligence/ai-analyst/critic";

/** Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial
 * com IA", section 6: pré-filtragem antes da IA, custo bounded). The AI
 * is only ever shown this many extra candidates beyond LIMIT — enough
 * real headroom to backfill a handful of AI-rejected picks, never the
 * whole universe. */
const AI_ASSISTED_BUFFER = 10;

const CHECKPOINT_DAYS = [7, 15, 30, 60, 90] as const;
const LIMIT = 30;

export interface LabComparisonSummary {
  referenceDate: Date;
  candidateUniverseSize: number;
  snapshots: Array<{
    snapshotId: string;
    methodology: LabMethodology;
    algorithmVersion: string;
    itemCount: number;
    discoveredNewCandidates: number | null;
    topItems: LabRankedItem[];
  }>;
  /** IA Crítica's own findings over the final ai_assisted_v1 selection —
   * also folded into that methodology's snapshot.notes as text, exposed
   * here separately so a caller can act on them structurally (e.g. a
   * report) without re-parsing text. */
  criticFindings: ReturnType<typeof runCriticalReview>;
}

/**
 * Runs all four methodologies against the SAME real candidate pool and
 * reference date, persists a permanent CommercialSelectionSnapshot (+
 * items + prospective checkpoints) for each — owner's authorization,
 * 2026-11-19: "registre permanentemente cada seleção... realize testes
 * retrospectivos... quando não houver histórico suficiente, inicie um
 * acompanhamento prospectivo."
 *
 * Never uses the algorithm's own score as proof of anything here — this
 * function only RECORDS what each methodology would have selected; the
 * actual comparison of outcomes happens independently, later, when
 * checkpoints resolve against real observed data (runDueCheckpoints).
 */
export async function runCommercialIntelligenceLab(): Promise<LabComparisonSummary> {
  const referenceDate = new Date();
  const { pool } = await buildCommercialCandidatePool();

  // multifactor_v3 needs its OWN group-aware selection (quotas), so its
  // ranking criterion is "would this candidate's merchantListingId be
  // selected, and at what rankingScore" — reuse the real selection.
  const v3Result = await selectVitrineCandidates(LIMIT);
  const v3ScoreByListingId = new Map(v3Result.candidates.map((c) => [c.merchantListingId, c.rankingScore]));

  // ai_assisted_v1's own extended, diversity-capped pool (LIMIT + buffer)
  // — reuses pickGlobalVitrineSelection exactly as selectVitrineCandidates
  // does, just with a larger limit so the AI safety filter has real
  // backfill headroom. Never a second, competing ranking formula.
  const activeEventNamesForReport = v3Result.activeEvents.map((a) => a.name).join(", ") || "nenhum";
  const { picked: extendedRankedPool } = pickGlobalVitrineSelection(v3Result.allScored, LIMIT + AI_ASSISTED_BUFFER, activeEventNamesForReport);
  const aiAssisted = await rankByAiAssisted(extendedRankedPool, pool, LIMIT);
  // IA Crítica (owner's authorization, 2026-11-22, section 6) — a second,
  // deterministic pass over the FINAL ai_assisted_v1 selection (post
  // safety-filter AND post priority-adjustment — `order`, never `picked`,
  // since `picked` is the pre-adjustment list and reviewing it would miss
  // whatever the priority adjustment itself changed), never a second
  // model call grading the first one's own output.
  const criticFindings = runCriticalReview(aiAssisted.order, aiAssisted.evaluationsByListing);

  const rankings: Record<LabMethodology, LabRankedItem[]> = {
    official_rank_only: rankByOfficialRankOnly(pool, LIMIT),
    panel_recommended: rankByPanelRecommended(pool, LIMIT),
    commission_only: rankByCommissionOnly(pool, LIMIT),
    commission_current_only: rankByCurrentCommissionOnly(pool, LIMIT),
    legacy_v2: rankByLegacyV2(pool, LIMIT),
    multifactor_v3: rankByMultifactorV3(pool, LIMIT, v3ScoreByListingId),
    ai_assisted_v1: aiAssisted.items,
  };

  // Discovery-capability axis (owner's requirement, evaluated separately
  // from ranking): how much of each methodology's OWN top-30 leans on
  // genuinely NEW finds from today's broadened discovery sweep
  // (VITRINE_SEASONAL/VITRINE_TRENDING) vs. the pre-existing baseline
  // pool (ML_GENERAL/ML_DEMAND/panel_pick/null). commission_only has no
  // discovery mechanism of its own — reported as null, never forced.
  const newDiscoverySources = new Set(["VITRINE_SEASONAL", "VITRINE_TRENDING"]);
  function countNewDiscoveries(items: LabRankedItem[]): number {
    return items.filter((i) => i.discoverySource && newDiscoverySources.has(i.discoverySource)).length;
  }
  const discoveredNewCandidates: Record<LabMethodology, number | null> = {
    official_rank_only: countNewDiscoveries(rankings.official_rank_only),
    panel_recommended: countNewDiscoveries(rankings.panel_recommended),
    commission_only: null,
    commission_current_only: null,
    legacy_v2: countNewDiscoveries(rankings.legacy_v2),
    multifactor_v3: countNewDiscoveries(rankings.multifactor_v3),
    ai_assisted_v1: countNewDiscoveries(rankings.multifactor_v3), // same ranking base as multifactor_v3 — the AI layer is eliminative, never a discovery mechanism of its own.
  };

  const summary: LabComparisonSummary = {
    referenceDate,
    candidateUniverseSize: pool.length,
    snapshots: [],
    criticFindings,
  };

  for (const methodology of Object.keys(rankings) as LabMethodology[]) {
    const items = rankings[methodology];
    const snapshot = await prisma.commercialSelectionSnapshot.create({
      data: {
        methodology,
        algorithmVersion: ALGORITHM_VERSIONS[methodology],
        referenceDate,
        candidateUniverseSize: pool.length,
        discoveredNewCandidates: discoveredNewCandidates[methodology],
        notes:
          methodology === "legacy_v2"
            ? "Metodologia re-aplicada sobre o pool já filtrado hoje — não é uma consulta independente como a execução histórica real (ver doc comment de rankByLegacyV2)."
            : methodology === "commission_only"
              ? "Critério puro de ranking (inclui comissão histórica/desatualizada) — baseline anterior, preservado para comparação histórica. Ver 'commission_current_only' para o critério vigente."
              : methodology === "commission_current_only"
                ? "Exclui comissão histórica/de categoria — só observação individual fresca (<=45 dias) ou campanha de ganhos extras ativa."
                : methodology === "panel_recommended"
                  ? "Produtos que o próprio painel de afiliados do Mercado Livre apresentou como destaque (mais vendido/recomendado/ganhos extras), lido ao vivo — ver data/ml-panel-reads/."
                  : methodology === "ai_assisted_v1"
                    ? [
                        "Base: ranking do multifactor_v3, com as avaliações reais da IA aplicadas em duas etapas sobre ele — filtro de segurança (só remove, ver safety-filter.ts) e, sobre o que sobreviveu, ajuste de prioridade (só reordena, nunca adiciona/remove, ver priority-adjustment.ts).",
                        aiAssisted.priorityAdjustments.length > 0
                          ? `Ajuste de prioridade — ${aiAssisted.priorityAdjustments.length} posição(ões) alterada(s): ${aiAssisted.priorityAdjustments.map((a) => `${a.merchantListingId}(${a.originalRank}→${a.adjustedRank})`).join(", ")}.`
                          : "Ajuste de prioridade — nenhuma mudança de posição nesta execução (sem recomendação 'priorizar' com evidência real suficiente, ou sem candidato elegível para subir).",
                        criticFindings.length > 0
                          ? `IA Crítica — ${criticFindings.length} achado(s): ${criticFindings.map((f) => `[${f.severity}] ${f.issue}: ${f.detail}`).join(" | ")}`
                          : "IA Crítica — nenhum achado nesta execução.",
                      ].join(" ")
                    : null,
      },
    });

    if (items.length > 0) {
      await prisma.commercialSelectionItem.createMany({
        data: items.map((item) => ({
          snapshotId: snapshot.id,
          merchantListingId: item.merchantListingId,
          title: item.title,
          rank: item.rank,
          scoreAtSelection: item.criterionValue,
          evidenceSnapshot: item.evidenceSnapshot as object,
        })),
      });

      await prisma.commercialSelectionCheckpoint.createMany({
        data: CHECKPOINT_DAYS.map((days) => ({
          snapshotId: snapshot.id,
          checkpointDays: days,
          dueAt: new Date(referenceDate.getTime() + days * 86_400_000),
        })),
      });
    }

    summary.snapshots.push({
      snapshotId: snapshot.id,
      methodology,
      algorithmVersion: ALGORITHM_VERSIONS[methodology],
      itemCount: items.length,
      discoveredNewCandidates: discoveredNewCandidates[methodology],
      topItems: items.slice(0, 10),
    });
  }

  return summary;
}
