import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { getPerformanceDashboardData } from "@/lib/queries/performance-dashboard";
import {
  StatCard,
  DashboardGroup,
  SubSection,
} from "@/components/admin/dashboard-ui";
import {
  DailyClicksBarChart,
  DailyPageviewsLineChart,
} from "@/components/admin/performance-charts";

export const metadata: Metadata = {
  title: "Desempenho — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const TREND_DAYS = 14;
const AUTOMATION_DAYS = 10;

function pctDelta(cur: number, prev: number): number {
  if (prev === 0) return cur === 0 ? 0 : 100;
  return ((cur - prev) / prev) * 100;
}

function DeltaLabel({ cur, prev }: { cur: number; prev: number }) {
  const d = pctDelta(cur, prev);
  const cls =
    d > 1
      ? "text-emerald-600 dark:text-emerald-400"
      : d < -1
        ? "text-rose-600 dark:text-rose-400"
        : "text-foreground/50";
  const arrow = d > 1 ? "↑" : d < -1 ? "↓" : "→";
  return (
    <span className={`text-xs font-medium ${cls}`}>
      {arrow} {Math.abs(d).toFixed(0)}% vs 7d anteriores
    </span>
  );
}

function timeAgo(date: Date): string {
  const diffH = Math.round((Date.now() - date.getTime()) / 36e5);
  if (diffH < 24) return `há ${diffH}h`;
  return `há ${Math.round(diffH / 24)}d`;
}

export default async function PerformanceDashboardPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const authorized = await isAdminRequestAuthorized(sessionToken);
  if (!authorized) {
    return <AdminLoginForm />;
  }

  const data = await getPerformanceDashboardData(TREND_DAYS, AUTOMATION_DAYS);
  const maxSourceClicks = Math.max(
    1,
    ...data.clickSources.map((s) => s.clicks),
  );

  const partialHeavyJobs = data.automation.filter((j) => {
    const total = j.success + j.partial + j.failed;
    return total > 0 && j.partial / total > 0.5;
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Desempenho</h1>
          <p className="text-foreground/50 mt-1 text-sm">
            Cliques afiliados, tráfego e saúde da automação — dados reais, sem
            estimativa de comissão/conversão. Seus próprios cliques e visitas
            (feitos logado no admin) não entram na conta.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          ← Admin
        </a>
      </div>

      <DashboardGroup title="Resumo (7 dias)">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="border-border-subtle rounded-lg border p-4">
            <div className="text-foreground/50 text-xs">Cliques (7d)</div>
            <div className="mt-1 text-2xl font-semibold">
              {data.summary.clicksLast7d}
            </div>
            <DeltaLabel
              cur={data.summary.clicksLast7d}
              prev={data.summary.clicksPrev7d}
            />
          </div>
          <div className="border-border-subtle rounded-lg border p-4">
            <div className="text-foreground/50 text-xs">Pageviews (7d)</div>
            <div className="mt-1 text-2xl font-semibold">
              {data.summary.pageviewsLast7d}
            </div>
            <DeltaLabel
              cur={data.summary.pageviewsLast7d}
              prev={data.summary.pageviewsPrev7d}
            />
          </div>
          <StatCard label="Cliques totais" value={data.summary.totalClicks} />
          <StatCard
            label="Links ativos ML"
            value={data.summary.activeLinksMl}
          />
          <StatCard
            label="Links ativos Shopee"
            value={data.summary.activeLinksShopee}
          />
        </div>
        {data.summary.pendingLinksMl > 0 && (
          <p className="text-foreground/60 text-xs">
            {data.summary.pendingLinksMl} link(s) ML aguardando na fila do
            admin.
          </p>
        )}
      </DashboardGroup>

      <DashboardGroup
        title="Cliques afiliados por dia"
        description={`Mercado Livre vs Shopee, últimos ${TREND_DAYS} dias.`}
      >
        <DailyClicksBarChart data={data.clicksDaily} />
      </DashboardGroup>

      <DashboardGroup
        title="Pageviews por dia"
        description={`Tráfego de primeira-parte (sem fingerprint), últimos ${TREND_DAYS} dias.`}
      >
        <DailyPageviewsLineChart data={data.pageviewsDaily} />
      </DashboardGroup>

      <DashboardGroup
        title="De onde vêm os cliques"
        description="source × pageType registrados no clique."
      >
        <div className="space-y-2">
          {data.clickSources.length === 0 && (
            <p className="text-foreground/50 text-sm">
              Sem cliques no período.
            </p>
          )}
          {data.clickSources.map((s, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="text-foreground/70 w-40 shrink-0 truncate text-xs">
                {s.source}{" "}
                <span className="text-foreground/40">({s.pageType})</span>
              </div>
              <div className="bg-foreground/5 h-2 flex-1 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(s.clicks / maxSourceClicks) * 100}%`,
                    background: "#2a78d6",
                  }}
                />
              </div>
              <div className="w-8 text-right text-xs font-medium tabular-nums">
                {s.clicks}
              </div>
            </div>
          ))}
        </div>
      </DashboardGroup>

      <DashboardGroup
        title="Produtos com mais cliques"
        description={`Top ${data.topProducts.length} nos últimos ${TREND_DAYS} dias.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 text-left text-sm">
            <thead>
              <tr className="text-foreground/50 text-xs">
                <th className="pb-2 font-medium">Canal</th>
                <th className="pb-2 font-medium">Produto</th>
                <th className="pb-2 text-right font-medium">Cliques</th>
                <th className="pb-2 font-medium">Último clique</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {data.topProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-foreground/50 py-3">
                    Sem cliques no período.
                  </td>
                </tr>
              )}
              {data.topProducts.map((p, i) => (
                <tr key={i}>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.merchant === "MERCADO_LIVRE"
                          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                          : p.merchant === "SHOPEE"
                            ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {p.merchant === "MERCADO_LIVRE"
                        ? "ML"
                        : p.merchant === "SHOPEE"
                          ? "Shopee"
                          : "Amazon"}
                    </span>
                  </td>
                  <td className="max-w-100 truncate py-2" title={p.title}>
                    {p.title}
                  </td>
                  <td className="py-2 text-right font-medium tabular-nums">
                    {p.clicks}
                  </td>
                  <td className="text-foreground/50 py-2 text-xs">
                    {timeAgo(p.lastClickAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardGroup>

      <DashboardGroup
        title="Saúde da automação"
        description={`Execuções por job, últimos ${AUTOMATION_DAYS} dias. O ciclo roda a cada 4h.`}
      >
        <SubSection title="Execuções por status">
          <div className="space-y-2">
            {data.automation.map((j) => {
              const total = j.success + j.partial + j.failed;
              if (total === 0) return null;
              return (
                <div key={j.job} className="flex items-center gap-3 text-sm">
                  <div className="w-52 shrink-0 font-medium">
                    {j.job.replace(/_/g, " ")}
                  </div>
                  <div className="bg-foreground/5 flex h-2.5 flex-1 overflow-hidden rounded-full">
                    {j.success > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${(j.success / total) * 100}%` }}
                        title={`SUCCESS: ${j.success}`}
                      />
                    )}
                    {j.partial > 0 && (
                      <div
                        className="h-full bg-amber-400"
                        style={{ width: `${(j.partial / total) * 100}%` }}
                        title={`PARTIAL: ${j.partial}`}
                      />
                    )}
                    {j.failed > 0 && (
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${(j.failed / total) * 100}%` }}
                        title={`FAILED: ${j.failed}`}
                      />
                    )}
                  </div>
                  <div className="text-foreground/50 w-12 text-right text-xs tabular-nums">
                    {total}x
                  </div>
                </div>
              );
            })}
          </div>
        </SubSection>
        {partialHeavyJobs.length > 0 && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
            ⚠️{" "}
            {partialHeavyJobs.map((j) => j.job.replace(/_/g, " ")).join(", ")}{" "}
            terminaram PARTIAL na maioria das execuções recentes — vale
            investigar (não é falha total: PARTIAL só significa que o job rodou
            com pelo menos um erro registrado).
          </div>
        )}
      </DashboardGroup>
    </div>
  );
}
