import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { getVitrineFinancialSummary } from "@/lib/services/vitrine-financials";
import { VitrineAdSpendForm, VitrineCommissionForm } from "@/components/vitrine-financial-forms";
import type { VitrineAdSpend, VitrineCommissionReport } from "@prisma/client";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — financeiro — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const brl = (n: number | null) =>
  n === null ? "sem dado" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function VitrineFinanceiroPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [summary, adSpends, commissionReports] = await Promise.all([
    getVitrineFinancialSummary({ periodStart, periodEnd }),
    prisma.vitrineAdSpend.findMany({ orderBy: { spentOn: "desc" }, take: 10 }),
    prisma.vitrineCommissionReport.findMany({ orderBy: { periodStart: "desc" }, take: 10 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/vitrine-inteligente" className="text-brand underline">
          ← Vitrine Inteligente
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Vitrine Inteligente — financeiro</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Cliques são automáticos (etiqueta vitrinedinamica). Investimento e
        comissão são sempre digitados por você — não existe hoje nenhuma API
        de reconciliação automática do Mercado Livre ou do Meta Ads.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Últimos 30 dias</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Cliques Vitrine" value={String(summary.vitrineClicks)} />
        <Stat label="Cliques do site" value={String(summary.siteClicks)} />
        <Stat label="Investimento" value={brl(summary.adSpendBrl)} />
        <Stat label="Comissão aprovada" value={brl(summary.approvedCommissionBrl)} />
        <Stat label="Comissão pendente" value={brl(summary.pendingCommissionBrl)} />
        <Stat label="Resultado após publicidade" value={brl(summary.resultAfterAdSpendBrl)} />
        <Stat label="ROI" value={summary.roiPercent === null ? "sem dado" : `${summary.roiPercent}%`} />
        <Stat label="Comissão por clique" value={brl(summary.commissionPerClickBrl)} />
        <Stat label="Comissão cancelada" value={brl(summary.cancelledCommissionBrl)} />
        <Stat label="CPC real" value={brl(summary.cpcBrl)} />
        <Stat label="CTR real" value={summary.ctrPercent === null ? "sem impressões importadas" : `${summary.ctrPercent}%`} />
        <Stat label="CPC máximo p/ equilíbrio" value={brl(summary.breakEvenCpcBrl)} />
      </div>
      <p className="text-foreground/50 mt-2 text-xs">
        Etiqueta: {summary.campaign}. CTR só aparece quando o Meta Insights importou impressões reais para o período — nunca estimado.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Registrar investimento (Meta Ads)</h2>
      <VitrineAdSpendForm />
      <ul className="mt-2 space-y-1 text-xs text-foreground/60">
        {adSpends.map((row: VitrineAdSpend) => (
          <li key={row.id}>
            {row.spentOn.toLocaleDateString("pt-BR")} — {brl(row.amountBrl.toNumber())} —{" "}
            {row.source === "meta_api" ? "automático (Meta)" : "manual"}
            {row.note ? ` — ${row.note}` : ""}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold">Registrar comissão (painel do Mercado Livre)</h2>
      <VitrineCommissionForm />
      <ul className="mt-2 space-y-1 text-xs text-foreground/60">
        {commissionReports.map((row: VitrineCommissionReport) => (
          <li key={row.id}>
            {row.periodStart.toLocaleDateString("pt-BR")}–{row.periodEnd.toLocaleDateString("pt-BR")} —
            direta {brl(row.directAmountBrl.toNumber())} + indireta {brl(row.indirectAmountBrl.toNumber())} —{" "}
            {row.status === "APPROVED" ? "aprovada" : "pendente"}
            {row.note ? ` — ${row.note}` : ""}
          </li>
        ))}
      </ul>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border-subtle rounded-lg border p-3">
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-foreground/60 text-xs">{label}</p>
    </div>
  );
}
