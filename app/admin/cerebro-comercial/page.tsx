import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { loadBrainDashboardData } from "@/lib/services/commercial-intelligence/brain-dashboard";
import { getVitrineFinancialSummary } from "@/lib/services/vitrine-financials";

export const metadata: Metadata = {
  title: "Cérebro Comercial — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const brl = (n: number | null) => (n === null ? "sem dado" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

const COMMISSION_LABEL: Record<string, string> = {
  confirmed_individual: "confirmada e recente",
  promotional_temporary: "promocional (temporária)",
  category_tier: "estimada por categoria",
  historical: "histórica (antiga)",
  unknown: "desconhecida",
};

export default async function CerebroComercialPage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) return <AdminLoginForm />;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  const [data, financial] = await Promise.all([loadBrainDashboardData(), getVitrineFinancialSummary({ periodStart, periodEnd })]);

  const readyToPrioritize = data.vitrineGeral.filter((r) => r.commissionStatus === "confirmed_individual" || r.commissionStatus === "promotional_temporary");
  const awaitingData = data.vitrineGeral.filter((r) => r.commissionStatus === "historical" || r.commissionStatus === "unknown");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin/vitrine-inteligente" className="text-brand underline">
          ← Vitrine Inteligente
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Cérebro Comercial</h1>
      <p className="mt-1 text-sm">
        <a href="/admin/cerebro-comercial/revisao" className="text-brand underline">
          Revisão da Vitrine Geral (prévia + aprovação) →
        </a>
      </p>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Lê exclusivamente dados já persistidos (seleção real da Vitrine Geral, avaliações de IA já pagas, cliques reais, relatórios de
        comissão) — nunca recalcula o pool completo nem chama a IA ao carregar esta página. Gerado em {data.generatedAt.toLocaleString("pt-BR")}.
      </p>

      <h2 className="mt-8 text-lg font-semibold">Receita agregada (30 dias)</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Cliques do site" value={String(financial.siteClicks)} />
        <Stat label="Comissão aprovada" value={brl(financial.approvedCommissionBrl)} />
        <Stat label="Comissão pendente" value={brl(financial.pendingCommissionBrl)} />
        <Stat label="Comissão por clique" value={brl(financial.commissionPerClickBrl)} />
      </div>
      <p className="text-foreground/50 mt-2 text-xs">
        Agregado por período, nunca por produto — o Mercado Livre não expõe atribuição de pedido por clique individual.{" "}
        <a href="/admin/vitrine-financeiro" className="text-brand underline">
          Registrar/consultar relatórios de comissão →
        </a>
      </p>

      <h2 className="mt-8 text-lg font-semibold">Prontos para priorização ({readyToPrioritize.length})</h2>
      <p className="text-foreground/70 mt-1 text-sm">Comissão confirmada e recente — nenhuma lacuna bloqueando a decisão.</p>
      <ProductTable rows={readyToPrioritize} />

      <h2 className="mt-8 text-lg font-semibold">Promissores, aguardando dados ({awaitingData.length})</h2>
      <p className="text-foreground/70 mt-1 text-sm">Comissão desconhecida ou desatualizada — dependem da fila abaixo.</p>
      <ProductTable rows={awaitingData} />

      <h2 className="mt-8 text-lg font-semibold">Fila de atualização de comissão (top {data.commissionQueue.length})</h2>
      <ol className="mt-2 space-y-2">
        {data.commissionQueue.map((item, i) => (
          <li key={item.merchantListingId} className="border-border-subtle rounded-lg border p-3 text-sm">
            <p className="font-semibold">
              {i + 1}. {item.title.slice(0, 70)}
            </p>
            <p className="text-foreground/60 mt-1 text-xs">Motivo: {item.reason}</p>
            <p className="text-foreground/60 text-xs">Decisão: {item.decision}</p>
          </li>
        ))}
      </ol>

      <h2 className="mt-8 text-lg font-semibold">Alertas da IA Crítica</h2>
      {data.criticFindings.length === 0 ? (
        <p className="text-foreground/60 mt-2 text-sm">Nenhum alerta nesta seleção.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {data.criticFindings.map((f, i) => (
            <li key={i} className="rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <strong>[{f.severity}] {f.issue}:</strong> {f.detail}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-lg font-semibold">Cliques reais por origem (30 dias)</h2>
      <p className="text-foreground/70 mt-1 text-sm">Total: {data.clicksLast30d}. Volume de clique não é prova de venda.</p>
      <ul className="mt-2 space-y-1 text-sm">
        {data.clicksBySource.map((c) => (
          <li key={c.source}>
            {c.source}: {c.clicks}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProductTable({ rows }: { rows: import("@/lib/services/commercial-intelligence/brain-dashboard").VitrineGeralRow[] }) {
  if (rows.length === 0) return <p className="text-foreground/60 mt-2 text-sm">Nenhum produto neste grupo.</p>;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="text-foreground/60">
            <th className="pr-3 pb-1">Produto</th>
            <th className="pr-3 pb-1">Score</th>
            <th className="pr-3 pb-1">Comissão</th>
            <th className="pr-3 pb-1">IA</th>
            <th className="pr-3 pb-1">Cliques (30d)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.merchantListingId} className="border-border-subtle border-t">
              <td className="py-1 pr-3">{r.title.slice(0, 55)}</td>
              <td className="py-1 pr-3">{r.score}</td>
              <td className="py-1 pr-3">{COMMISSION_LABEL[r.commissionStatus] ?? r.commissionStatus}</td>
              <td className="py-1 pr-3">
                {r.aiEvaluation ? (r.aiEvaluation.isFallback ? "fallback" : r.aiEvaluation.recommendation) : "sem avaliação"}
              </td>
              <td className="py-1 pr-3">{r.clicks30d}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
