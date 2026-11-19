import { prisma } from "@/lib/db";

/**
 * Vitrine Inteligente Fase 3 — financial tracking by tag (project brief
 * section 17). Real inputs only:
 *  - clicks: AffiliateClick rows with campaign="vitrine_dinamica" — fully
 *    automated, already logged by app/go/vitrine/.../route.ts.
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
  /** Resultado após publicidade = comissão aprovada − investimento.
   * Null whenever either side of the subtraction is missing data. */
  resultAfterAdSpendBrl: number | null;
  /** ROI = resultado / investimento × 100. Null when adSpend is 0 or
   * missing (never divide by an assumed value). */
  roiPercent: number | null;
  /** Comissão aprovada por clique — null when there are no comparable
   * clicks yet. */
  commissionPerClickBrl: number | null;
}

function sumDecimal(values: { toNumber(): number }[]): number {
  return values.reduce((acc, v) => acc + v.toNumber(), 0);
}

export async function getVitrineFinancialSummary(input: {
  periodStart: Date;
  periodEnd: Date;
}): Promise<VitrineFinancialSummary> {
  const { periodStart, periodEnd } = input;

  const [vitrineClicks, siteClicks, adSpends, commissionReports] = await Promise.all([
    prisma.affiliateClick.count({
      where: { campaign: "vitrine_dinamica", createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.affiliateClick.count({
      where: {
        campaign: { not: "vitrine_dinamica" },
        createdAt: { gte: periodStart, lt: periodEnd },
      },
    }),
    prisma.vitrineAdSpend.findMany({
      where: { spentOn: { gte: periodStart, lt: periodEnd } },
      select: { amountBrl: true },
    }),
    prisma.vitrineCommissionReport.findMany({
      where: { periodStart: { gte: periodStart }, periodEnd: { lte: periodEnd } },
      select: { directAmountBrl: true, indirectAmountBrl: true, status: true },
    }),
  ]);

  const adSpendBrl = adSpends.length > 0 ? sumDecimal(adSpends.map((a) => a.amountBrl)) : null;

  const approved = commissionReports.filter((c) => c.status === "APPROVED");
  const pending = commissionReports.filter((c) => c.status === "PENDING");
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

  return {
    periodStart,
    periodEnd,
    vitrineClicks,
    siteClicks,
    adSpendBrl,
    directCommissionBrl: directAmount,
    indirectCommissionBrl: indirectAmount,
    approvedCommissionBrl,
    pendingCommissionBrl,
    resultAfterAdSpendBrl,
    roiPercent,
    commissionPerClickBrl,
  };
}
