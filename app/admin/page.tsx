import type { Metadata } from "next";
import { cookies } from "next/headers";
import { env } from "@/lib/config/env";
import {
  getTodayStats,
  getWeeklyStats,
  getTrafficOverview,
  getLatestJobRuns,
  getSeoStatus,
  getPrivacyStatus,
  getCurrentCatalogOverview,
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
import { MlAffiliateQueueItem } from "@/components/ml-affiliate-queue-item";
import {
  getMlAffiliateQueue,
  DEFAULT_QUEUE_DISPLAY_LIMIT,
} from "@/lib/queries/ml-affiliate-queue";
import { ProductCandidateItem } from "@/components/product-candidate-item";
import { ProductCandidateForm } from "@/components/product-candidate-form";
import {
  getProductCandidateQueue,
  listActiveCategoryOptions,
} from "@/lib/queries/product-candidate-queue";
import { OperationsOpportunityList } from "@/components/operations-opportunity-list";
import {
  getTodaysOpportunities,
  getOperationsSummary,
} from "@/lib/queries/operations-center";
import { getAdminRadarFeed } from "@/lib/queries/radar-events";
import { getDemandIntelligenceSnapshot } from "@/lib/queries/demand-intelligence-v2";
import { formatDemandMomentum } from "@/lib/services/demand-intelligence-v2";
import { getMercadoLivreCredentialStatus } from "@/lib/services/ml-token-store";
import type { PagePropsWithSearch } from "@/lib/next-route-types";
import {
  StatCard,
  StatusPill,
  DashboardGroup,
  SubSection,
} from "@/components/admin/dashboard-ui";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function AdminPage(props: PagePropsWithSearch) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  const authorized = await isAdminRequestAuthorized(sessionToken);

  if (!authorized) {
    return <AdminLoginForm />;
  }

  const searchParams = await props.searchParams;
  const mlOauthStatus =
    typeof searchParams?.ml_oauth === "string"
      ? searchParams.ml_oauth
      : undefined;
  const mlOauthReason =
    typeof searchParams?.reason === "string" ? searchParams.reason : undefined;

  const [
    today,
    weekly,
    traffic,
    jobRuns,
    seo,
    catalog,
    amazonBr,
    amazonUs,
    privacy,
    policyRecent,
    unexpectedCatalogAlerts,
    mlAffiliateQueue,
    todaysOpportunities,
    operationsSummary,
    radarFeed,
    demandIntelligence,
    mlCredentialStatus,
    productCandidates,
    categoryOptions,
  ] = await Promise.all([
    getTodayStats(),
    getWeeklyStats(),
    getTrafficOverview(),
    getLatestJobRuns(),
    getSeoStatus(),
    getCurrentCatalogOverview(),
    Promise.resolve(getBrazilAmazonStatus()),
    Promise.resolve(getUsAmazonStatus()),
    getPrivacyStatus(),
    Promise.resolve(isPolicyReviewRecent()),
    getUnexpectedCatalogAlerts(),
    getMlAffiliateQueue(),
    getTodaysOpportunities(),
    getOperationsSummary(),
    getAdminRadarFeed(200),
    getDemandIntelligenceSnapshot({
      limit: 25,
      candidateLimit: 400,
      historySignalsPerListing: 30,
    }),
    getMercadoLivreCredentialStatus(),
    getProductCandidateQueue(),
    listActiveCategoryOptions(),
  ]);
  const mlAffiliateQueueDisplayed = mlAffiliateQueue.slice(
    0,
    DEFAULT_QUEUE_DISPLAY_LIMIT,
  );
  const brCompliancePass = checkLiveActivationReadiness("BR").every(
    (c) => c.pass,
  );
  const hasAutomationAttentionToday =
    today.automationFailedToday > 0 ||
    today.automationPartialToday > 0 ||
    today.automationErrorsToday > 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const priceDropsToday = radarFeed.filter(
    (i) => i.event.type === "PRICE_DROP" && i.event.occurredAt >= todayStart,
  ).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="flex items-center gap-3">
          <a
            href="/admin/desempenho"
            className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
          >
            Desempenho (cliques diários) →
          </a>
          {isAdminAuthConfigured() && <AdminLogoutButton />}
        </div>
      </div>

      {!isAdminAuthConfigured() && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
          ⚠️ ADMIN_PASSWORD_HASH não está configurado — este painel está aberto
          sem autenticação. Aceitável apenas em desenvolvimento local (bloqueado
          automaticamente em produção — ver docs/PRODUCTION_READINESS.md e rode{" "}
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

      {mlOauthStatus === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          ✅ Mercado Livre conectado com sucesso.
        </div>
      )}
      {mlOauthStatus === "error" && (
        <div className="mt-4 rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300">
          ❌ Falha ao conectar o Mercado Livre
          {mlOauthReason ? ` (${mlOauthReason})` : ""}. Tente novamente pelo
          botão em Integrações → Mercado Livre.
        </div>
      )}

      {/* ---------------- CENTRO DE OPERAÇÕES ---------------- */}
      <DashboardGroup
        title="Centro de operações"
        description="O que fazer hoje para ganhar mais comissão — oportunidades priorizadas por MonetizationScore em todos os merchants."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Novos listings hoje"
            value={operationsSummary.newListingsToday}
          />
          <StatCard
            label="Links ativos"
            value={operationsSummary.activeLinks}
          />
          <StatCard
            label="Listings sem link ativo"
            value={operationsSummary.listingsWithoutActiveLink}
            helper="Catálogo observado sem link afiliado ACTIVE. Não representa necessariamente trabalho manual pendente."
          />
          <StatCard
            label="Cliques afiliados hoje"
            value={operationsSummary.affiliateClicksToday}
          />
          <StatCard
            label="Merchants ativos"
            value={operationsSummary.activeMerchants.length}
          />
        </div>

        <SubSection title="Radar hoje">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Eventos detectados" value={radarFeed.length} />
            <StatCard
              label="Publicáveis (com link ativo)"
              value={radarFeed.filter((i) => i.ctaHref !== null).length}
            />
            <StatCard
              label="Monetizáveis sem link"
              value={
                radarFeed.filter(
                  (i) => i.ctaHref === null && i.merchant === "MERCADO_LIVRE",
                ).length
              }
            />
            <StatCard
              label="Quedas de preço reais"
              value={
                radarFeed.filter((i) => i.event.type === "PRICE_DROP").length
              }
            />
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {radarFeed.length === 0 && (
              <li className="text-foreground/50">
                Nenhum evento detectado ainda — rode os scripts de coleta
                (Shopee/Mercado Livre) para gerar sinais reais.
              </li>
            )}
            {radarFeed.slice(0, 8).map((item, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">
                  [{item.event.type}] {item.title}
                </span>
                <span className="text-foreground/60 shrink-0">
                  {item.event.headline}
                </span>
              </li>
            ))}
          </ul>
        </SubSection>

        <SubSection title="Oportunidades de hoje">
          <OperationsOpportunityList items={todaysOpportunities} />
        </SubSection>

        <SubSection title="Pendências de receita — Mercado Livre">
          <p className="text-foreground/60 mb-3 text-xs">
            Itens acima do corte econômico, com demanda forte detectada e sem
            link afiliado ACTIVE. Cole o link gerado no painel oficial ML
            (etiqueta &quot;precocaindo&quot;) e o item sai da fila
            automaticamente.
          </p>
          {mlAffiliateQueue.length === 0 ? (
            <p className="text-foreground/50 text-sm">
              Nenhuma oportunidade economicamente prioritária aguarda link
              afiliado do Mercado Livre.
            </p>
          ) : (
            <>
              <p className="text-foreground/60 mb-3 text-xs">
                Mostrando os {mlAffiliateQueueDisplayed.length} melhores de{" "}
                {mlAffiliateQueue.length} aguardando — os próximos aparecem
                sozinhos assim que estes forem resolvidos.
              </p>
              <div className="space-y-3">
                {mlAffiliateQueueDisplayed.map((item, i) => (
                  <MlAffiliateQueueItem
                    key={item.merchantListingId}
                    remaining={mlAffiliateQueueDisplayed.length - i}
                    {...item}
                  />
                ))}
              </div>
            </>
          )}
        </SubSection>

        {env.MANUAL_PRODUCTS_ENABLED && (
          <SubSection title="Candidatos Amazon">
            <p className="text-foreground/60 mb-3 text-xs">
              Sem PA-API ainda (precisa de 3 vendas qualificadas em 180 dias) —
              descoberta é manual. Registre um ASIN real que valha a pena
              avaliar, aprove os que se confirmarem, e promova a produto real
              (rascunho, ativação continua um passo separado).
            </p>
            <ProductCandidateForm />
            {productCandidates.length === 0 ? (
              <p className="text-foreground/50 text-sm">
                Nenhum candidato aguardando revisão agora.
              </p>
            ) : (
              <div className="space-y-3">
                {productCandidates.map((item) => (
                  <ProductCandidateItem
                    key={item.id}
                    categoryOptions={categoryOptions}
                    {...item}
                  />
                ))}
              </div>
            )}
          </SubSection>
        )}
      </DashboardGroup>

      {/* ---------------- SAÚDE DO SISTEMA ---------------- */}
      <DashboardGroup
        title="Saúde do sistema"
        description="Jobs, erros e última atualização."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Listings atualizados hoje"
            value={today.listingsUpdatedToday}
          />
          <StatCard
            label="Quedas de preço detectadas hoje"
            value={priceDropsToday}
          />
          <StatCard
            label="Erros das automações hoje"
            value={today.automationErrorsToday}
            helper="Soma de erros reportados pelos jobs; PARTIAL com poucos erros não é falha total."
          />
          <StatCard
            label="Jobs FAILED hoje"
            value={today.automationFailedToday}
          />
          <StatCard
            label="Jobs PARTIAL hoje"
            value={today.automationPartialToday}
          />
        </div>
        {hasAutomationAttentionToday && (
          <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
            Há automações com erro, falha ou execução parcial hoje — veja a
            tabela abaixo.
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
        description="Tráfego, buscas e cliques afiliados do PreçoCaindo em todos os merchants monitorados."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Pageviews hoje" value={traffic.pageviews} />
          <StatCard label="Buscas hoje" value={traffic.searches} />
          <StatCard
            label="Cliques afiliados hoje"
            value={traffic.clicksToday}
          />
          <StatCard
            label="Cliques afiliados 7d"
            value={traffic.clicksLast7Days}
          />
        </div>
        <p className="text-foreground/50 text-xs">
          CTR indisponível — pageviews dependem de consentimento e não são
          comparáveis diretamente aos cliques afiliados.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Mercado Livre hoje"
            value={traffic.clicksByMerchant.mercadoLivre}
          />
          <StatCard
            label="Shopee hoje"
            value={traffic.clicksByMerchant.shopee}
          />
          <StatCard
            label="Amazon hoje"
            value={traffic.clicksByMerchant.amazon}
          />
          <StatCard
            label="Outros hoje"
            value={traffic.clicksByMerchant.other}
          />
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <SubSection title="Produtos com mais cliques (7d)">
            <ul className="space-y-2 text-sm">
              {weekly.topProductPagesByClicks.length === 0 && (
                <li className="text-foreground/50">Sem cliques ainda.</li>
              )}
              {weekly.topProductPagesByClicks.map((row, i) => (
                <li key={i} className="flex justify-between">
                  <span>{row.productTitle ?? row.pageSlug}</span>
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

      {/* ---------------- DEMAND INTELLIGENCE ---------------- */}
      <DashboardGroup
        title="Demand Intelligence"
        description="DemandScore V2 em SHADOW: força observada da demanda, sem comissão, link ativo, MonetizationScore ou decisão pública."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Candidatos avaliados"
            value={demandIntelligence.candidateListings}
          />
          <StatCard
            label="Signals carregados"
            value={demandIntelligence.historySignalsLoaded}
          />
          <StatCard
            label="Signals com rank"
            value={demandIntelligence.audit.rankedSignals}
          />
          <StatCard
            label="Listings com rank"
            value={demandIntelligence.audit.rankedListings}
          />
          <StatCard
            label="Tempo"
            value={`${demandIntelligence.elapsedMs}ms`}
          />
        </div>

        <SubSection title="Top DemandScore V2 — SHADOW">
          <div className="overflow-x-auto">
            <table className="w-full min-w-220 text-left text-sm">
              <thead>
                <tr className="text-foreground/50 text-xs">
                  <th className="pb-2 font-medium">Produto</th>
                  <th className="pb-2 font-medium">Merchant</th>
                  <th className="pb-2 font-medium">Rank atual</th>
                  <th className="pb-2 font-medium">Rank médio</th>
                  <th className="pb-2 font-medium">Melhor</th>
                  <th className="pb-2 font-medium">Top 10</th>
                  <th className="pb-2 font-medium">Persistência</th>
                  <th className="pb-2 font-medium">Momentum</th>
                  <th className="pb-2 font-medium">Obs.</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">DemandScore V2</th>
                </tr>
              </thead>
              <tbody className="divide-border-subtle divide-y">
                {demandIntelligence.topByDemandScoreV2.length === 0 && (
                  <tr>
                    <td colSpan={11} className="text-foreground/50 py-3">
                      Nenhum histórico de ranking ML disponível para calcular
                      DemandScore V2.
                    </td>
                  </tr>
                )}
                {demandIntelligence.topByDemandScoreV2.map((row) => (
                  <tr key={row.merchantListingId}>
                    <td className="max-w-72 py-2 pr-3">
                      <span className="line-clamp-2">{row.title}</span>
                      <span className="text-foreground/45 block text-xs">
                        {row.externalId}
                      </span>
                    </td>
                    <td className="py-2 pr-3">Mercado Livre</td>
                    <td className="py-2 pr-3">
                      {row.currentRank ? `#${row.currentRank}` : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {row.averageRank !== null ? `#${row.averageRank}` : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {row.bestRank ? `#${row.bestRank}` : "—"}
                    </td>
                    <td className="py-2 pr-3">
                      {(row.top10Share * 100).toFixed(0)}%
                      <span className="text-foreground/50 block text-xs">
                        {row.consecutiveTop10Cycles} seguidos
                      </span>
                    </td>
                    <td className="py-2 pr-3">{row.demandPersistence}</td>
                    <td className="py-2 pr-3">
                      {formatDemandMomentum(row.demandMomentum)}
                      <span className="text-foreground/50 ml-1 text-xs">
                        {row.demandMomentum}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{row.rankedCycles}</td>
                    <td className="py-2 pr-3">{row.confidence}</td>
                    <td className="py-2 pr-3 font-semibold">
                      {row.demandScoreV2}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-foreground/50 mt-3 text-xs">
            SHADOW: estes números não alteram Publication Gate, sitemap,
            scanner, links, MonetizationScore, OpportunityScore ou cron.
          </p>
        </SubSection>
      </DashboardGroup>

      {/* ---------------- CATÁLOGO ---------------- */}
      <DashboardGroup
        title="Catálogo"
        description="Catálogo observado ML/Shopee, links ativos e prontidão de publicação."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="MerchantListings ativos"
            value={catalog.merchantListingsTotal}
          />
          <StatCard
            label="Mercado Livre"
            value={catalog.mercadoLivreListings}
          />
          <StatCard label="Shopee" value={catalog.shopeeListings} />
          <StatCard
            label="CanonicalProducts"
            value={catalog.canonicalProducts}
          />
          <StatCard label="Links ACTIVE" value={catalog.activeAffiliateLinks} />
        </div>

        <SubSection title="SEO / Publication Gate">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Unidades avaliadas" value={seo.evaluated} />
            <StatCard label="Indexáveis" value={seo.indexable} />
            <StatCard label="Noindex" value={seo.noindex} />
            <StatCard label="URLs no sitemap" value={seo.productSitemapUrls} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="CTA elegível" value={seo.ctaEligible} />
            <StatCard
              label="Oportunidades pendentes"
              value={seo.opportunities}
            />
          </div>
          <p className="text-foreground/50 mt-3 text-xs">
            Mesma fonte lógica do sitemap de produtos: Publication Gate sobre
            MerchantListing/CanonicalProduct. Conteúdo editorial hoje:
            publicadas {today.pagesPublishedToday} · rejeitadas{" "}
            {today.pagesRejectedToday}.
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

        <SubSection title="Mercado Livre — autenticação">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill
              ok={mlCredentialStatus.connected}
              label={
                mlCredentialStatus.connected ? "Conectado" : "Não conectado"
              }
            />
            {mlCredentialStatus.expiresAt && (
              <span className="text-foreground/60 text-xs">
                Token válido até {mlCredentialStatus.expiresAt.toISOString()}{" "}
                (renovação automática antes de expirar)
              </span>
            )}
            <a
              href="/api/admin/mercadolivre/authorize"
              className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
            >
              {mlCredentialStatus.connected ? "Reconectar" : "Conectar"} Mercado
              Livre →
            </a>
          </div>
        </SubSection>
      </DashboardGroup>

      {/* ---------------- PRIVACIDADE ---------------- */}
      <DashboardGroup title="Privacidade">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Analytics aceito" value={privacy.analyticsGranted} />
          <StatCard
            label="Analytics recusado"
            value={privacy.analyticsDenied}
          />
          <StatCard label="Marketing aceito" value={privacy.marketingGranted} />
          <StatCard
            label="Marketing recusado"
            value={privacy.marketingDenied}
          />
        </div>
        <p className="text-foreground/50 mt-2 text-xs">
          Provedor de remarketing ativo: {privacy.remarketingProvider}
        </p>
      </DashboardGroup>
    </div>
  );
}
