import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

/**
 * Vitrine Inteligente Fase 3 — "aprendizado contínuo" (project brief
 * section 19), implemented honestly rather than simulated.
 *
 * What real data this project actually has: AffiliateClick rows
 * (campaign="vitrine_dinamica") and Henrique's periodic, manual
 * VitrineCommissionReport entries. What it does NOT have: ad impressions
 * (no Meta Ads API integration) or per-click commission attribution (ML's
 * own panel reports commission in aggregate, not per click) — so a
 * genuine per-score-component learning algorithm (e.g. "raise the
 * seasonality weight because seasonal products converted better") is not
 * something this data can honestly support yet. Building one anyway would
 * be exactly the "apresentar estimativas como resultados comprovados" the
 * brief explicitly forbids.
 *
 * So this function does the part that IS honest: it watches whether
 * enough real evidence has accumulated to even consider adjusting
 * lib/config/vitrine-score-weights.ts, and reports that status plainly.
 * Below the threshold, it is a deliberate no-op. Changing the weights
 * themselves stays a human decision (whoever maintains this code edits
 * the weights file and calls recordWeightChange() below for the audit
 * trail) — not something this function does unsupervised, until there's
 * a real statistical basis for doing it automatically.
 */

const MIN_VITRINE_CLICKS = 500;
const MIN_APPROVED_COMMISSION_REPORTS = 2;

export interface WeightReviewStatus {
  readyForReview: boolean;
  vitrineClickCount: number;
  approvedReportCount: number;
  reason: string;
}

/** Owner's authorization, 2026-11-19 ("Autorizo a construção integral
 * dessa camada agora", section 4/7): generalized to accept any
 * attribution tag, never hardcoded to "vitrine_dinamica" — so
 * "combo_inteligente" (once that module exists) reuses this exact
 * readiness gate instead of a parallel copy, and the two tags' real
 * evidence volumes are never mixed together. */
export async function reviewVitrineLearningReadiness(campaign = "vitrine_dinamica"): Promise<WeightReviewStatus> {
  const [vitrineClickCount, approvedReportCount] = await Promise.all([
    prisma.affiliateClick.count({ where: { campaign } }),
    prisma.vitrineCommissionReport.count({ where: { status: "APPROVED" } }),
  ]);

  const readyForReview =
    vitrineClickCount >= MIN_VITRINE_CLICKS &&
    approvedReportCount >= MIN_APPROVED_COMMISSION_REPORTS;

  const reason = readyForReview
    ? `${vitrineClickCount} cliques e ${approvedReportCount} relatórios de comissão aprovados — dados suficientes para uma revisão manual dos pesos.`
    : `Ainda não há evidência suficiente (${vitrineClickCount}/${MIN_VITRINE_CLICKS} cliques, ${approvedReportCount}/${MIN_APPROVED_COMMISSION_REPORTS} relatórios aprovados) — pesos mantidos como estão.`;

  if (readyForReview) {
    logger.info("vitrine_weight_learning.ready_for_review", {
      vitrineClickCount,
      approvedReportCount,
    });
  }

  return { readyForReview, vitrineClickCount, approvedReportCount, reason };
}

/** Call this whenever lib/config/vitrine-score-weights.ts's values are
 * actually changed (by a human, after reviewing reviewVitrineLearningReadiness's
 * output) — records the before/after for reversibility (brief: "manter
 * histórico das alterações de metodologia, permitindo reversão"). */
export async function recordWeightChange(
  weights: Record<string, number>,
  reason: string,
): Promise<void> {
  await prisma.vitrineWeightHistory.create({ data: { weights, reason } });
}
