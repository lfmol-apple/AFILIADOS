import { prisma } from "@/lib/db";
import { evaluateCommissionEvidence, type CommissionEvidenceType } from "@/lib/services/commercial-intelligence/commission-evidence";
import { runCriticalReview, type CriticFinding } from "@/lib/services/commercial-intelligence/ai-analyst/critic";
import type { VitrineCandidate } from "@/lib/services/vitrine-selection";
import type { AnalystEvaluation } from "@/lib/services/commercial-intelligence/ai-analyst/types";

/**
 * Painel único do Cérebro Comercial — owner's authorization, 2026-11-22
 * ("Operação Cérebro Comercial", item 5: "integrar a inteligência ao
 * painel existente"). Reads ONLY already-persisted/real data — never
 * recomputes the full candidate pool (buildCommercialCandidatePool is
 * too expensive to run on every admin page load) and never calls the
 * AI analyst itself (this page must never spend money just by being
 * viewed). The IA Crítica is the one exception: it's a pure, free,
 * deterministic function over data already fetched here — safe to run
 * on every page load.
 *
 * Evaluations are matched to the real Vitrine Geral selection by
 * CANONICAL PRODUCT, not by merchantListingId — the AI may have
 * evaluated a different real offer/listing of the same product (the
 * ranking recomputes which specific offer represents a product each
 * run), so a listing-id-only join would under-report real coverage.
 */

export interface VitrineGeralRow {
  merchantListingId: string;
  canonicalProductId: string | null;
  title: string;
  score: number;
  activatedAt: Date | null;
  aiEvaluation: {
    recommendation: AnalystEvaluation["recommendation"];
    commercialScore: number;
    confidence: number;
    isFallback: boolean;
  } | null;
  commissionStatus: CommissionEvidenceType;
  commissionDetail: string;
  clicks30d: number;
}

export interface CommissionQueueEntry {
  merchantListingId: string;
  title: string;
  reason: string;
  decision: string;
}

export interface BrainDashboardData {
  generatedAt: Date;
  vitrineGeral: VitrineGeralRow[];
  commissionQueue: CommissionQueueEntry[];
  criticFindings: CriticFinding[];
  clicksLast30d: number;
  clicksBySource: { source: string; clicks: number }[];
}

const VITRINE_ID = "vitrine-geral-original";

export async function loadBrainDashboardData(): Promise<BrainDashboardData> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  const [selections, recentEvaluations, clicksBySourceRaw] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { vitrineId: VITRINE_ID, status: "ACTIVE" },
      orderBy: { score: "desc" },
      include: {
        merchantListing: {
          include: {
            canonicalProduct: { select: { id: true, title: true } },
            signals: {
              where: { source: { in: ["panel_pick"] } },
              orderBy: { observedAt: "desc" },
              take: 1,
              select: { raw: true, observedAt: true },
            },
          },
        },
      },
    }),
    // Real evaluations persisted so far (Fase D + any future run) —
    // mapped by the CANONICAL PRODUCT of the listing they were run
    // against, so they can match a Vitrine Geral row even when the
    // specific offer differs.
    prisma.commercialAnalystEvaluation.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        merchantListingId: true,
        recommendation: true,
        commercialScore: true,
        confidence: true,
        isFallback: true,
      },
    }),
    prisma.affiliateClick.groupBy({
      by: ["source"],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
  ]);

  const evaluatedListingIds = recentEvaluations.map((e) => e.merchantListingId);
  const evaluatedListings = evaluatedListingIds.length
    ? await prisma.merchantListing.findMany({
        where: { id: { in: evaluatedListingIds } },
        select: { id: true, canonicalProductId: true },
      })
    : [];
  const canonicalByEvaluatedListing = new Map(evaluatedListings.map((l) => [l.id, l.canonicalProductId]));
  // Most recent real evaluation per canonical product (never fallback,
  // unless that's all there is — a fallback is still reported, just
  // flagged, never hidden).
  const evaluationByCanonical = new Map<string, (typeof recentEvaluations)[number]>();
  for (const evaluation of recentEvaluations) {
    const canonicalId = canonicalByEvaluatedListing.get(evaluation.merchantListingId);
    if (!canonicalId) continue;
    const existing = evaluationByCanonical.get(canonicalId);
    if (!existing || (existing.isFallback && !evaluation.isFallback)) {
      evaluationByCanonical.set(canonicalId, evaluation);
    }
  }

  const clicksByCanonicalRaw = await prisma.affiliateClick.groupBy({
    by: ["canonicalProductId"],
    where: {
      createdAt: { gte: thirtyDaysAgo },
      canonicalProductId: { in: selections.map((s) => s.merchantListing.canonicalProductId).filter((x): x is string => x !== null) },
    },
    _count: { _all: true },
  });
  const clicksByCanonical = new Map(clicksByCanonicalRaw.map((c) => [c.canonicalProductId, c._count._all]));

  const vitrineGeral: VitrineGeralRow[] = [];
  const candidatesForCritic: VitrineCandidate[] = [];
  const evaluationMapForCritic = new Map<string, AnalystEvaluation>();

  for (const selection of selections) {
    const listing = selection.merchantListing;
    const panelSignal = listing.signals[0];
    const panelRaw = panelSignal?.raw as { rate?: number } | null;
    const commissionEvidence = evaluateCommissionEvidence({
      individualRate: panelRaw?.rate ?? null,
      individualCapturedAt: panelSignal?.observedAt ?? null,
      mlCategoryId: null,
      currentPrice: null,
    });

    const canonicalId = listing.canonicalProductId;
    const matchedEvaluation = canonicalId ? evaluationByCanonical.get(canonicalId) : undefined;

    vitrineGeral.push({
      merchantListingId: listing.id,
      canonicalProductId: canonicalId,
      title: listing.canonicalProduct?.title ?? "(sem título)",
      score: selection.score,
      activatedAt: selection.activatedAt,
      aiEvaluation: matchedEvaluation
        ? {
            recommendation: matchedEvaluation.recommendation as AnalystEvaluation["recommendation"],
            commercialScore: matchedEvaluation.commercialScore,
            confidence: matchedEvaluation.confidence,
            isFallback: matchedEvaluation.isFallback,
          }
        : null,
      commissionStatus: commissionEvidence.type,
      commissionDetail: commissionEvidence.source,
      clicks30d: (canonicalId ? clicksByCanonical.get(canonicalId) : undefined) ?? 0,
    });

    // Minimal shape runCriticalReview actually reads — never a full,
    // separately-maintained VitrineCandidate reconstruction.
    candidatesForCritic.push({
      merchantListingId: listing.id,
      categoryId: null,
      commissionEvidence,
      priceCompetitiveness: { hasConfirmedPriceDrop: false, competitivenessScore: null, siblingOfferCount: 0 },
      commercialAudit: { verdict: "aprovado_para_teste" },
    } as unknown as VitrineCandidate);
    if (matchedEvaluation) {
      evaluationMapForCritic.set(listing.id, {
        merchantListingId: listing.id,
        recommendation: matchedEvaluation.recommendation as AnalystEvaluation["recommendation"],
        commercialScore: matchedEvaluation.commercialScore,
        confidence: matchedEvaluation.confidence,
        favorableArguments: [],
        risks: [],
        evidenceUsed: [],
        missingData: [],
        isFallback: matchedEvaluation.isFallback,
        fallbackReason: null,
        model: null,
        costUsd: null,
        cached: true,
      });
    }
  }

  const criticFindings = runCriticalReview(candidatesForCritic, evaluationMapForCritic);

  const commissionQueue: CommissionQueueEntry[] = vitrineGeral
    .filter((r) => r.commissionStatus === "historical" || r.commissionStatus === "unknown")
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((r) => ({
      merchantListingId: r.merchantListingId,
      title: r.title,
      reason:
        r.commissionStatus === "unknown"
          ? "nenhuma evidência de comissão — nunca lida no painel"
          : `comissão desatualizada (${r.commissionDetail})`,
      decision: `confirmar se ainda justifica a posição atual (pontuação ${r.score})`,
    }));

  return {
    generatedAt: now,
    vitrineGeral,
    commissionQueue,
    criticFindings,
    clicksLast30d: clicksBySourceRaw.reduce((sum, c) => sum + c._count._all, 0),
    clicksBySource: clicksBySourceRaw.map((c) => ({ source: c.source ?? "(desconhecido)", clicks: c._count._all })).sort((a, b) => b.clicks - a.clicks),
  };
}
