import type { Metadata } from "next";
import { env } from "@/lib/config/env";
import {
  getTodayStats,
  getWeeklyStats,
  getPriorityBreakdown,
  getTrafficOverview,
  getLatestJobRuns,
  getSeoStatus,
  getAmazonStatus,
  getPrivacyStatus,
} from "@/lib/queries/admin";
import { isPolicyReviewRecent } from "@/lib/amazon/policy-guard";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border-subtle p-4">
      <div className="text-xs text-foreground/50">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        ok
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`} aria-hidden />
      {label}
    </span>
  );
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  const token = typeof searchParams?.token === "string" ? searchParams.token : undefined;

  if (env.ADMIN_ACCESS_TOKEN && token !== env.ADMIN_ACCESS_TOKEN) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Este painel exige um token de acesso. Adicione <code>?token=SEU_TOKEN</code> à URL.
        </p>
      </div>
    );
  }

  const [today, weekly, priority, traffic, jobRuns, seo, amazon, privacy, policyRecent] = await Promise.all([
    getTodayStats(),
    getWeeklyStats(),
    getPriorityBreakdown(),
    getTrafficOverview(),
    getLatestJobRuns(),
    getSeoStatus(),
    Promise.resolve(getAmazonStatus()),
    getPrivacyStatus(),
    Promise.resolve(isPolicyReviewRecent()),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {!env.ADMIN_ACCESS_TOKEN && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
          ⚠️ ADMIN_ACCESS_TOKEN não está configurado — este painel está publicamente acessível.
          Aceitável apenas em desenvolvimento local (ver docs/PRODUCTION_READINESS.md).
        </div>
      )}

      {!policyRecent && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ Políticas Amazon não revisadas há mais de 90 dias. Atualize AMAZON_POLICY_REVIEW_DATE
          após revisar docs/AMAZON_COMPLIANCE.md.
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground/70">Visão geral</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Produtos monitorados" value={today.productsMonitored} />
          <StatCard label="HOT" value={priority.HOT} />
          <StatCard label="WARM" value={priority.WARM} />
          <StatCard label="COLD" value={priority.COLD} />
          <StatCard label="Pageviews hoje" value={traffic.pageviews} />
          <StatCard label="Buscas hoje" value={traffic.searches} />
          <StatCard label="Cliques Amazon hoje" value={traffic.clicks} />
          <StatCard label="CTR (cliques/pageviews)" value={traffic.ctr !== null ? `${traffic.ctr}%` : "—"} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-foreground/70">Hoje</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Preços atualizados" value={today.pricesUpdatedToday} />
          <StatCard label="Quedas detectadas" value={today.dropsDetectedToday} />
          <StatCard label="Páginas publicadas" value={today.pagesPublished} />
          <StatCard label="Páginas rejeitadas" value={today.pagesRejected} />
          <StatCard label="Erros das automações" value={today.automationErrorsToday} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-foreground/70">Automação — última execução por job</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-140 text-left text-sm">
            <thead>
              <tr className="text-xs text-foreground/50">
                <th className="pb-2 font-medium">Job</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Duração</th>
                <th className="pb-2 font-medium">Processados</th>
                <th className="pb-2 font-medium">Erros</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {jobRuns.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-foreground/50">
                    Nenhuma execução registrada ainda.
                  </td>
                </tr>
              )}
              {jobRuns.map((run) => (
                <tr key={run.job}>
                  <td className="py-2 font-medium">{run.job}</td>
                  <td className="py-2">{run.status}</td>
                  <td className="py-2">{run.durationMs !== null ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}</td>
                  <td className="py-2">{run.processed}</td>
                  <td className="py-2">{run.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground/70">SEO</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Páginas publicáveis" value={seo.publishable} />
            <StatCard label="Rejeitadas" value={seo.rejected} />
            <StatCard label="Noindex" value={seo.noindexed} />
            <StatCard label="Oportunidades pendentes" value={seo.opportunities} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground/70">Amazon</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill ok={amazon.mode === "live"} label={`Modo: ${amazon.mode.toUpperCase()}`} />
            <StatusPill ok={amazon.tagConfigured} label={amazon.tagConfigured ? "Tag configurada" : "Tag não configurada"} />
            <StatusPill
              ok={amazon.creatorsApiConfigured}
              label={amazon.creatorsApiConfigured ? "Creators API configurada" : "Creators API não configurada"}
            />
            <StatusPill ok={amazon.compliancePass} label={amazon.compliancePass ? "Compliance PASS" : "Compliance FAIL"} />
          </div>
          <p className="mt-2 text-xs text-foreground/50">Revisão de políticas: {amazon.policyReviewDate}</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground/70">Privacidade</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Analytics aceito" value={privacy.analyticsGranted} />
            <StatCard label="Analytics recusado" value={privacy.analyticsDenied} />
            <StatCard label="Marketing aceito" value={privacy.marketingGranted} />
            <StatCard label="Marketing recusado" value={privacy.marketingDenied} />
          </div>
          <p className="mt-2 text-xs text-foreground/50">
            Provedor de remarketing ativo: {privacy.remarketingProvider}
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground/70">Produtos com mais cliques (7d)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.topProductsByClicks.length === 0 && <li className="text-foreground/50">Sem cliques ainda.</li>}
            {weekly.topProductsByClicks.map((row, i) => (
              <li key={i} className="flex justify-between">
                <span>{row.product?.title ?? "—"}</span>
                <span className="font-medium">{row.clicks}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground/70">Páginas com mais cliques (7d)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.topPagesByClicks.length === 0 && <li className="text-foreground/50">Sem cliques ainda.</li>}
            {weekly.topPagesByClicks.map((row, i) => (
              <li key={i} className="flex justify-between">
                <span>
                  {row.pageType}/{row.pageSlug}
                </span>
                <span className="font-medium">{row.clicks}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground/70">Categorias mais fortes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.categoryStrength.map((c) => (
              <li key={c.id} className="flex justify-between">
                <span>{c.name}</span>
                <span className="font-medium">{c._count.products}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-foreground/70">Maiores quedas</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.biggestDrops.length === 0 && <li className="text-foreground/50">Nenhuma queda registrada.</li>}
            {weekly.biggestDrops.map((row) => (
              <li key={row.id} className="flex justify-between">
                <span>{row.product.title}</span>
                <span className="font-medium">{row.dropPercentage?.toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-foreground/70">Jobs com falha (7d)</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.failedJobs.length === 0 && <li className="text-foreground/50">Nenhuma falha recente.</li>}
            {weekly.failedJobs.map((run) => (
              <li key={run.id} className="flex justify-between">
                <span>{run.job}</span>
                <span className="text-foreground/50">{run.startedAt.toISOString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
