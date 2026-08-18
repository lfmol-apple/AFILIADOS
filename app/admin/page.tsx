import type { Metadata } from "next";
import { env } from "@/lib/config/env";
import {
  getTodayStats,
  getWeeklyStats,
  getPriorityBreakdown,
  getTrafficOverview,
  getLatestJobRuns,
  getSeoStatus,
  getPrivacyStatus,
} from "@/lib/queries/admin";
import {
  isPolicyReviewRecent,
  checkLiveActivationReadiness,
} from "@/lib/amazon/policy-guard";
import { getBrazilAmazonStatus, getUsAmazonStatus } from "@/lib/amazon/status";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-border-subtle rounded-lg border p-4">
      <div className="text-foreground/50 text-xs">{label}</div>
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
      <span
        className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`}
        aria-hidden
      />
      {label}
    </span>
  );
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const searchParams = await props.searchParams;
  const token =
    typeof searchParams?.token === "string" ? searchParams.token : undefined;

  if (env.ADMIN_ACCESS_TOKEN && token !== env.ADMIN_ACCESS_TOKEN) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Acesso restrito</h1>
        <p className="text-foreground/60 mt-2 text-sm">
          Este painel exige um token de acesso. Adicione{" "}
          <code>?token=SEU_TOKEN</code> à URL.
        </p>
      </div>
    );
  }

  const [
    today,
    weekly,
    priority,
    traffic,
    jobRuns,
    seo,
    amazonBr,
    amazonUs,
    privacy,
    policyRecent,
  ] = await Promise.all([
    getTodayStats(),
    getWeeklyStats(),
    getPriorityBreakdown(),
    getTrafficOverview(),
    getLatestJobRuns(),
    getSeoStatus(),
    Promise.resolve(getBrazilAmazonStatus()),
    Promise.resolve(getUsAmazonStatus()),
    getPrivacyStatus(),
    Promise.resolve(isPolicyReviewRecent()),
  ]);
  const brCompliancePass = checkLiveActivationReadiness("BR").every(
    (c) => c.pass,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Admin</h1>

      {!env.ADMIN_ACCESS_TOKEN && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
          ⚠️ ADMIN_ACCESS_TOKEN não está configurado — este painel está
          publicamente acessível. Aceitável apenas em desenvolvimento local (ver
          docs/PRODUCTION_READINESS.md).
        </div>
      )}

      {!policyRecent && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ Políticas Amazon não revisadas há mais de 90 dias. Atualize
          AMAZON_POLICY_REVIEW_DATE após revisar docs/AMAZON_COMPLIANCE.md.
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-foreground/70 text-sm font-semibold">
          Visão geral
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Produtos monitorados"
            value={today.productsMonitored}
          />
          <StatCard label="HOT" value={priority.HOT} />
          <StatCard label="WARM" value={priority.WARM} />
          <StatCard label="COLD" value={priority.COLD} />
          <StatCard label="Pageviews hoje" value={traffic.pageviews} />
          <StatCard label="Buscas hoje" value={traffic.searches} />
          <StatCard label="Cliques Amazon hoje" value={traffic.clicks} />
          <StatCard
            label="CTR (cliques/pageviews)"
            value={traffic.ctr !== null ? `${traffic.ctr}%` : "—"}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-foreground/70 text-sm font-semibold">Hoje</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Preços atualizados"
            value={today.pricesUpdatedToday}
          />
          <StatCard
            label="Quedas detectadas"
            value={today.dropsDetectedToday}
          />
          <StatCard label="Páginas publicadas" value={today.pagesPublished} />
          <StatCard label="Páginas rejeitadas" value={today.pagesRejected} />
          <StatCard
            label="Erros das automações"
            value={today.automationErrorsToday}
          />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-foreground/70 text-sm font-semibold">
          Automação — última execução por job
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-140 text-left text-sm">
            <thead>
              <tr className="text-foreground/50 text-xs">
                <th className="pb-2 font-medium">Job</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Duração</th>
                <th className="pb-2 font-medium">Processados</th>
                <th className="pb-2 font-medium">Erros</th>
              </tr>
            </thead>
            <tbody className="divide-border-subtle divide-y">
              {jobRuns.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-foreground/50 py-3">
                    Nenhuma execução registrada ainda.
                  </td>
                </tr>
              )}
              {jobRuns.map((run) => (
                <tr key={run.job}>
                  <td className="py-2 font-medium">{run.job}</td>
                  <td className="py-2">{run.status}</td>
                  <td className="py-2">
                    {run.durationMs !== null
                      ? `${(run.durationMs / 1000).toFixed(1)}s`
                      : "—"}
                  </td>
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
          <h2 className="text-foreground/70 text-sm font-semibold">SEO</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Páginas publicáveis" value={seo.publishable} />
            <StatCard label="Rejeitadas" value={seo.rejected} />
            <StatCard label="Noindex" value={seo.noindexed} />
            <StatCard
              label="Oportunidades pendentes"
              value={seo.opportunities}
            />
          </div>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Amazon Brasil
          </h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-foreground/60">Store ID</dt>
              <dd className="font-medium">{amazonBr.storeId}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-foreground/60">Tracking ID PreçoCaindo</dt>
              <dd className="font-medium">{amazonBr.trackingId}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill
              ok={amazonBr.provider === "live"}
              label={`Provider: ${amazonBr.provider.toUpperCase()}`}
            />
            <StatusPill
              ok={amazonBr.apiEnabled}
              label={
                amazonBr.apiEnabled ? "API habilitada" : "API desabilitada"
              }
            />
            <StatusPill
              ok={amazonBr.creatorsApiAccountApproved}
              label={
                amazonBr.creatorsApiAccountApproved
                  ? "Conta aprovada p/ Creators API"
                  : "Conta NÃO aprovada p/ Creators API"
              }
            />
            <StatusPill
              ok={amazonBr.qualifiedSalesRequirementMet}
              label={
                amazonBr.qualifiedSalesRequirementMet
                  ? "Vendas qualificadas OK"
                  : "Vendas qualificadas PENDENTE"
              }
            />
            <StatusPill
              ok={brCompliancePass}
              label={
                brCompliancePass ? "Compliance PASS" : "Compliance PENDING"
              }
            />
          </div>
          <p className="text-foreground/50 mt-2 text-xs">
            Revisão de políticas: {env.AMAZON_POLICY_REVIEW_DATE}
          </p>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Amazon EUA
          </h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-foreground/60">Store ID</dt>
              <dd className="font-medium">{amazonUs.storeId}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusPill
              ok={amazonUs.precoCaindoRegistered}
              label={
                amazonUs.precoCaindoRegistered
                  ? "precocaindo.com.br cadastrado"
                  : "precocaindo.com.br NÃO cadastrado"
              }
            />
            <StatusPill
              ok={amazonUs.paymentConfigured}
              label={
                amazonUs.paymentConfigured
                  ? "Pagamento configurado"
                  : "Pagamento PENDENTE"
              }
            />
            <StatusPill
              ok={amazonUs.apiEnabled}
              label={
                amazonUs.apiEnabled ? "API habilitada" : "API desabilitada"
              }
            />
            <StatusPill
              ok={amazonUs.operationalOnPrecoCaindo}
              label={
                amazonUs.operationalOnPrecoCaindo
                  ? "Marketplace operacional"
                  : "Marketplace NÃO operacional"
              }
            />
          </div>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Privacidade
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <StatCard
              label="Analytics aceito"
              value={privacy.analyticsGranted}
            />
            <StatCard
              label="Analytics recusado"
              value={privacy.analyticsDenied}
            />
            <StatCard
              label="Marketing aceito"
              value={privacy.marketingGranted}
            />
            <StatCard
              label="Marketing recusado"
              value={privacy.marketingDenied}
            />
          </div>
          <p className="text-foreground/50 mt-2 text-xs">
            Provedor de remarketing ativo: {privacy.remarketingProvider}
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Produtos com mais cliques (7d)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.topProductsByClicks.length === 0 && (
              <li className="text-foreground/50">Sem cliques ainda.</li>
            )}
            {weekly.topProductsByClicks.map((row, i) => (
              <li key={i} className="flex justify-between">
                <span>{row.product?.title ?? "—"}</span>
                <span className="font-medium">{row.clicks}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-foreground/70 text-sm font-semibold">
            Páginas com mais cliques (7d)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.topPagesByClicks.length === 0 && (
              <li className="text-foreground/50">Sem cliques ainda.</li>
            )}
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
          <h2 className="text-foreground/70 text-sm font-semibold">
            Categorias mais fortes
          </h2>
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
          <h2 className="text-foreground/70 text-sm font-semibold">
            Maiores quedas
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.biggestDrops.length === 0 && (
              <li className="text-foreground/50">Nenhuma queda registrada.</li>
            )}
            {weekly.biggestDrops.map((row) => (
              <li key={row.id} className="flex justify-between">
                <span>{row.product.title}</span>
                <span className="font-medium">
                  {row.dropPercentage?.toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sm:col-span-2">
          <h2 className="text-foreground/70 text-sm font-semibold">
            Jobs com falha (7d)
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {weekly.failedJobs.length === 0 && (
              <li className="text-foreground/50">Nenhuma falha recente.</li>
            )}
            {weekly.failedJobs.map((run) => (
              <li key={run.id} className="flex justify-between">
                <span>{run.job}</span>
                <span className="text-foreground/50">
                  {run.startedAt.toISOString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
