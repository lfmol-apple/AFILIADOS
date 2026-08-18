import type { Metadata } from "next";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import {
  getTodayStats,
  getWeeklyStats,
  getPriorityBreakdown,
  getTrafficOverview,
  getLatestJobRuns,
  getSeoStatus,
  getPrivacyStatus,
  getCatalogSnapshot,
  getUnexpectedCatalogAlerts,
} from "@/lib/queries/admin";
import {
  isPolicyReviewRecent,
  checkLiveActivationReadiness,
} from "@/lib/amazon/policy-guard";
import { getBrazilAmazonStatus, getUsAmazonStatus } from "@/lib/amazon/status";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthConfigured,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { AdminLogoutButton } from "@/components/admin-logout-button";

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

/** Top-level grouping used to organize the dashboard into the four areas
 * an operator should be able to scan in seconds: Saúde do sistema,
 * Negócio, Catálogo, Integrações — presentation only, no data changes. */
function DashboardGroup({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border-subtle mt-12 border-t pt-8 first:mt-8 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && (
        <p className="text-foreground/50 mt-1 text-sm">{description}</p>
      )}
      <div className="mt-5 space-y-8">{children}</div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-foreground/70 text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default async function AdminPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const authorized = await isAdminRequestAuthorized(sessionToken);

  if (!authorized) {
    return <AdminLoginForm />;
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
    catalogBr,
    catalogUs,
    unexpectedCatalogAlerts,
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
    getCatalogSnapshot("BR"),
    getCatalogSnapshot("US"),
    getUnexpectedCatalogAlerts(),
  ]);
  const brCompliancePass = checkLiveActivationReadiness("BR").every(
    (c) => c.pass,
  );
  const hasFailedJobsToday = today.automationErrorsToday > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        {isAdminAuthConfigured() && <AdminLogoutButton />}
      </div>

      {!isAdminAuthConfigured() && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
          ⚠️ ADMIN_PASSWORD_HASH não está configurado — este painel está
          aberto sem autenticação. Aceitável apenas em desenvolvimento local
          (bloqueado automaticamente em produção — ver
          docs/PRODUCTION_READINESS.md e rode{" "}
          <code>npm run admin:hash-password</code>).
        </div>
      )}

      {unexpectedCatalogAlerts.length > 0 && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
          ⚠️ Existem produtos em marketplaces desativados — isso não deveria
          acontecer:{" "}
          {unexpectedCatalogAlerts
            .map((a) => `${a.marketplace}: ${a.productCount} produto(s)`)
            .join(", ")}
          . Investigue antes de habilitar esse marketplace.
        </div>
      )}

      {!policyRecent && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ Políticas Amazon não revisadas há mais de 90 dias. Atualize
          AMAZON_POLICY_REVIEW_DATE após revisar docs/AMAZON_COMPLIANCE.md.
        </div>
      )}

      {/* ---------------- SAÚDE DO SISTEMA ---------------- */}
      <DashboardGroup
        title="Saúde do sistema"
        description="Jobs, erros e última atualização."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Preços atualizados hoje" value={today.pricesUpdatedToday} />
          <StatCard label="Quedas detectadas hoje" value={today.dropsDetectedToday} />
          <StatCard
            label="Erros das automações hoje"
            value={today.automationErrorsToday}
          />
        </div>
        {hasFailedJobsToday && (
          <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            ⚠️ Há erros de automação registrados hoje — veja a tabela abaixo.
          </p>
        )}

        <SubSection title="Automação — última execução por job">
          <div className="overflow-x-auto">
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
                    <td className="py-2">
                      {run.status === "FAILED" ? (
                        <span className="font-medium text-rose-600 dark:text-rose-400">
                          {run.status}
                        </span>
                      ) : run.status === "PARTIAL" ? (
                        <span className="font-medium text-amber-600 dark:text-amber-400">
                          {run.status}
                        </span>
                      ) : (
                        run.status
                      )}
                    </td>
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
        </SubSection>

        <SubSection title="Jobs com falha (7d)">
          <ul className="space-y-2 text-sm">
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
        </SubSection>
      </DashboardGroup>

      {/* ---------------- NEGÓCIO ---------------- */}
      <DashboardGroup
        title="Negócio"
        description="Tráfego, buscas e cliques para a Amazon."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Pageviews hoje" value={traffic.pageviews} />
          <StatCard label="Buscas hoje" value={traffic.searches} />
          <StatCard label="Cliques Amazon hoje" value={traffic.clicks} />
          <StatCard
            label="CTR (cliques/pageviews)"
            value={traffic.ctr !== null ? `${traffic.ctr}%` : "—"}
          />
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <SubSection title="Produtos com mais cliques (7d)">
            <ul className="space-y-2 text-sm">
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
          </SubSection>

          <SubSection title="Páginas com mais cliques (7d)">
            <ul className="space-y-2 text-sm">
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
          </SubSection>
        </div>
      </DashboardGroup>

      {/* ---------------- CATÁLOGO ---------------- */}
      <DashboardGroup
        title="Catálogo"
        description="Produtos monitorados, prioridade e conteúdo."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Produtos monitorados" value={today.productsMonitored} />
          <StatCard label="HOT" value={priority.HOT} />
          <StatCard label="WARM" value={priority.WARM} />
          <StatCard label="COLD" value={priority.COLD} />
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <SubSection title="Catálogo BR">
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Produtos (total)" value={catalogBr.totalProducts} />
              <StatCard label="Ativos" value={catalogBr.activeProducts} />
              <StatCard label="HOT" value={catalogBr.priorityBreakdown.HOT} />
              <StatCard label="WARM" value={catalogBr.priorityBreakdown.WARM} />
              <StatCard label="COLD" value={catalogBr.priorityBreakdown.COLD} />
              <StatCard label="Cliques (7d)" value={catalogBr.clicksLast7Days} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill ok={catalogBr.enabled} label={catalogBr.enabled ? "Habilitado" : "Desabilitado"} />
            </div>
            <p className="text-foreground/50 mt-2 text-xs">
              Último refresh de catálogo:{" "}
              {catalogBr.lastRefreshAt
                ? catalogBr.lastRefreshAt.toISOString()
                : "nunca"}
            </p>
          </SubSection>

          <SubSection title="Catálogo EUA">
            {!catalogUs.enabled && catalogUs.totalProducts === 0 ? (
              <p className="text-foreground/50 text-sm">
                Marketplace EUA desativado — nenhum dado operacional. Isso é o
                estado esperado enquanto AMAZON_US_ENABLED=false.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Produtos (total)" value={catalogUs.totalProducts} />
                  <StatCard label="Ativos" value={catalogUs.activeProducts} />
                  <StatCard label="HOT" value={catalogUs.priorityBreakdown.HOT} />
                  <StatCard label="WARM" value={catalogUs.priorityBreakdown.WARM} />
                  <StatCard label="COLD" value={catalogUs.priorityBreakdown.COLD} />
                  <StatCard label="Cliques (7d)" value={catalogUs.clicksLast7Days} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill ok={catalogUs.enabled} label={catalogUs.enabled ? "Habilitado" : "Desabilitado"} />
                </div>
              </>
            )}
          </SubSection>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <SubSection title="Maiores quedas">
            <ul className="space-y-2 text-sm">
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
          </SubSection>

          <SubSection title="Categorias mais fortes">
            <ul className="space-y-2 text-sm">
              {weekly.categoryStrength.map((c) => (
                <li key={c.id} className="flex justify-between">
                  <span>{c.name}</span>
                  <span className="font-medium">{c._count.products}</span>
                </li>
              ))}
            </ul>
          </SubSection>
        </div>

        <SubSection title="SEO / conteúdo">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Páginas publicáveis" value={seo.publishable} />
            <StatCard label="Rejeitadas" value={seo.rejected} />
            <StatCard label="Noindex" value={seo.noindexed} />
            <StatCard label="Oportunidades pendentes" value={seo.opportunities} />
          </div>
          <p className="text-foreground/50 mt-3 text-xs">
            Páginas publicadas hoje: {today.pagesPublished} · Rejeitadas hoje:{" "}
            {today.pagesRejected}
          </p>
        </SubSection>
      </DashboardGroup>

      {/* ---------------- INTEGRAÇÕES ---------------- */}
      <DashboardGroup
        title="Integrações"
        description="Status Amazon BR/US e compliance."
      >
        <div className="grid gap-8 sm:grid-cols-2">
          <SubSection title="Amazon Brasil">
            <dl className="space-y-1.5 text-sm">
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
          </SubSection>

          <SubSection title="Amazon EUA">
            <dl className="space-y-1.5 text-sm">
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
          </SubSection>
        </div>
      </DashboardGroup>

      {/* ---------------- PRIVACIDADE ---------------- */}
      <DashboardGroup title="Privacidade">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Analytics aceito" value={privacy.analyticsGranted} />
          <StatCard label="Analytics recusado" value={privacy.analyticsDenied} />
          <StatCard label="Marketing aceito" value={privacy.marketingGranted} />
          <StatCard label="Marketing recusado" value={privacy.marketingDenied} />
        </div>
        <p className="text-foreground/50 mt-2 text-xs">
          Provedor de remarketing ativo: {privacy.remarketingProvider}
        </p>
      </DashboardGroup>
    </div>
  );
}
