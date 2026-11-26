import { prisma } from "@/lib/db";

/**
 * Vitrine Inteligente Fase 3 — financial tracking by tag (project brief
 * section 17). Real inputs only:
 *  - clicks: AffiliateClick rows with campaign=<vitrine's own
 *    attributionTag> — fully automated, already logged by
 *    app/go/vitrine/.../route.ts (lib/services/vitrine-redirect.ts).
 *  - ad spend / commission: Henrique's manual entries (VitrineAdSpend,
 *    VitrineCommissionReport) — there is no automated source for either
 *    today (no Meta Ads API integration, no ML/Shopee commission-
 *    reconciliation API; see this module's own audit).
 *
 * A period with no recorded spend/commission is reported as `null`, never
 * as 0 — "no data yet" and "confirmed zero" must never look the same.
 */

export interface VitrineFinancialSummary {
  periodStart: Date;
  periodEnd: Date;
  /** Which attribution tag this summary covers — owner's authorization,
   * 2026-11-19, "Arquitetura compartilhada": "preservando a possibilidade
   * de avaliar separadamente os resultados das etiquetas vitrinedinamica
   * e combointeligente." Never hardcoded to one tag internally. */
  campaign: string;
  vitrineClicks: number;
  siteClicks: number;
  adSpendBrl: number | null;
  directCommissionBrl: number | null;
  indirectCommissionBrl: number | null;
  /** Only commission reports marked APPROVED — pending figures are
   * reported separately, never folded into this (project brief: nunca
   * tratar comissão pendente como dinheiro recebido). */
  approvedCommissionBrl: number | null;
  pendingCommissionBrl: number | null;
  /** Owner's authorization, 2026-11-19, "Integração financeira":
   * "diferencie comissões pendentes, aprovadas e canceladas." A reversed
   * sale — real money that was never actually earned, kept as its own
   * figure, never silently subtracted from approved. */
  cancelledCommissionBrl: number | null;
  /** Resultado após publicidade = comissão aprovada − investimento.
   * Null whenever either side of the subtraction is missing data. */
  resultAfterAdSpendBrl: number | null;
  /** ROI = resultado / investimento × 100. Null when adSpend is 0 or
   * missing (never divide by an assumed value). */
  roiPercent: number | null;
  /** Comissão aprovada por clique — null when there are no comparable
   * clicks yet. */
  commissionPerClickBrl: number | null;
  /** CPC real = gasto Meta / nossos próprios cliques confirmados (não os
   * cliques que o Meta reporta — os que de fato chegaram no nosso link).
   * Null when adSpend or clicks are missing. */
  cpcBrl: number | null;
  /** CTR real — só existe quando o Meta reportou impressões reais para o
   * período (level=campaign, nunca por produto — ver meta-ads-insights.ts).
   * Null sempre que não houver impressões reais importadas. */
  ctrPercent: number | null;
  /** O CPC máximo que ainda daria resultado >= 0, dado a comissão
   * aprovada por clique já observada — é matematicamente o mesmo valor
   * de commissionPerClickBrl (o ponto de equilíbrio É a comissão por
   * clique), mas exposto com o nome que o dono pediu explicitamente.
   * Null nas mesmas condições de commissionPerClickBrl — nunca estimado
   * sem base real. */
  breakEvenCpcBrl: number | null;
}

function sumDecimal(values: { toNumber(): number }[]): number {
  return values.reduce((acc, v) => acc + v.toNumber(), 0);
}

export async function getVitrineFinancialSummary(input: {
  periodStart: Date;
  periodEnd: Date;
  /** Owner's authorization, 2026-11-19: defaults to "vitrinedinamica",
   * the legacy vitrine's own real attributionTag (unchanged behavior) —
   * pass another vitrine's attributionTag to scope the summary to it,
   * reusing this exact function, never a parallel copy.
   *
   * Reconciled 2026-11-26 (recovered from feat/vitrine-segunda's
   * 153764d, click campaign tag follows the real owning vitrine): this
   * default used to be the literal "vitrine_dinamica" (with an
   * underscore the real attributionTag never had) — harmless on its
   * own since every click-writing/reading site shared that same typo,
   * but it would have silently zeroed out every new click once
   * vitrine-redirect.ts started writing the REAL attributionTag
   * instead. Fixed here in the same step so neither side regresses. */
  campaign?: string;
}): Promise<VitrineFinancialSummary> {
  const { periodStart, periodEnd } = input;
  const campaign = input.campaign ?? "vitrinedinamica";

  const [vitrineClicks, siteClicks, adSpends, commissionReports] = await Promise.all([
    prisma.affiliateClick.count({
      where: { campaign, createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.affiliateClick.count({
      where: {
        campaign: { not: campaign },
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    }),
    prisma.vitrineAdSpend.findMany({
      where: { spentOn: { gte: periodStart, lt: periodEnd } },
      select: { spentOn: true, amountBrl: true, source: true, impressions: true, metaClicks: true },
    }),
    prisma.vitrineCommissionReport.findMany({
      where: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
      select: { directAmountBrl: true, indirectAmountBrl: true, status: true },
    }),
  ]);

  // One row per day: prefer the real Meta Insights API pull over a manual
  // entry for the same day, so a day with both never double-counts.
  const adSpendByDay = new Map<
    string,
    { amountBrl: { toNumber(): number }; source: string; impressions: number | null; metaClicks: number | null }
  >();
  for (const row of adSpends) {
    const key = row.spentOn.toISOString().slice(0, 10);
    const existing = adSpendByDay.get(key);
    if (!existing || (existing.source !== "meta_api" && row.source === "meta_api")) {
      adSpendByDay.set(key, row);
    }
  }
  const adSpendBrl =
    adSpendByDay.size > 0 ? sumDecimal([...adSpendByDay.values()].map((a) => a.amountBrl)) : null;
  const daysWithImpressions = [...adSpendByDay.values()].filter((d) => d.impressions !== null);
  const totalImpressions =
    daysWithImpressions.length > 0 ? daysWithImpressions.reduce((acc, d) => acc + (d.impressions ?? 0), 0) : null;

  const approved = commissionReports.filter((c) => c.status === "APPROVED");
  const pending = commissionReports.filter((c) => c.status === "PENDING");
  const cancelled = commissionReports.filter((c) => c.status === "CANCELLED");
  const directAmount =
    commissionReports.length > 0 ? sumDecimal(commissionReports.map((c) => c.directAmountBrl)) : null;
  const indirectAmount =
    commissionReports.length > 0 ? sumDecimal(commissionReports.map((c) => c.indirectAmountBrl)) : null;
  const approvedCommissionBrl =
    approved.length > 0
      ? sumDecimal(approved.map((c) => c.directAmountBrl)) + sumDecimal(approved.map((c) => c.indirectAmountBrl))
      : null;
  const pendingCommissionBrl =
    pending.length > 0
      ? sumDecimal(pending.map((c) => c.directAmountBrl)) + sumDecimal(pending.map((c) => c.indirectAmountBrl))
      : null;
  const cancelledCommissionBrl =
    cancelled.length > 0
      ? sumDecimal(cancelled.map((c) => c.directAmountBrl)) + sumDecimal(cancelled.map((c) => c.indirectAmountBrl))
      : null;

  const resultAfterAdSpendBrl =
    approvedCommissionBrl !== null && adSpendBrl !== null
      ? Math.round((approvedCommissionBrl - adSpendBrl) * 100) / 100
      : null;
  const roiPercent =
    resultAfterAdSpendBrl !== null && adSpendBrl !== null && adSpendBrl > 0
      ? Math.round((resultAfterAdSpendBrl / adSpendBrl) * 10000) / 100
      : null;
  const commissionPerClickBrl =
    approvedCommissionBrl !== null && vitrineClicks > 0
      ? Math.round((approvedCommissionBrl / vitrineClicks) * 100) / 100
      : null;
  const cpcBrl = adSpendBrl !== null && vitrineClicks > 0 ? Math.round((adSpendBrl / vitrineClicks) * 100) / 100 : null;
  const ctrPercent =
    totalImpressions !== null && totalImpressions > 0
      ? Math.round((vitrineClicks / totalImpressions) * 10000) / 100
      : null;
  // The break-even CPC IS the commission-per-click already computed —
  // exposed under the name the owner explicitly asked for, never a
  // second, independent calculation.
  const breakEvenCpcBrl = commissionPerClickBrl;

  return {
    periodStart,
    periodEnd,
    campaign,
    vitrineClicks,
    siteClicks,
    adSpendBrl,
    directCommissionBrl: directAmount,
    indirectCommissionBrl: indirectAmount,
    cancelledCommissionBrl,
    cpcBrl,
    ctrPercent,
    breakEvenCpcBrl,
    approvedCommissionBrl,
    pendingCommissionBrl,
    resultAfterAdSpendBrl,
    roiPercent,
    commissionPerClickBrl,
  };
}
