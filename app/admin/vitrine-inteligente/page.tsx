import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { formatCommissionEvidence, summarizeCommissionFreshness, COMMISSION_TYPE_LABELS } from "@/lib/services/commercial-intelligence/commission-evidence-labels";
import type { CommissionEvidenceType } from "@/lib/services/commercial-intelligence/commission-evidence";
import { getLegacyVitrineId } from "@/lib/services/vitrine-manager";

export const metadata: Metadata = {
  title: "Vitrine Inteligente — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const GROUP_LABEL: Record<string, string> = {
  sazonal: "Sazonal",
  recorrente: "Campeão recorrente",
  emergente: "Emergente",
};

const brl = (n: number | null) =>
  n === null ? "sem dado" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function VitrineInteligentePage() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(
    cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
  );
  if (!authorized) return <AdminLoginForm />;

  // Owner's authorization, 2026-11-22 ("Proteção da Vitrine Geral"): real
  // bug this closes — this page used to query VitrineSelection by
  // `status: "ACTIVE"` alone, with no vitrineId filter. The instant a
  // second real vitrine got its own ACTIVE rows, this page (the Vitrine
  // Geral's own admin view) would have silently started showing that
  // other vitrine's products mixed into its own. Resolved through the
  // same single source of truth jobs/vitrine-renew.ts and the Meta
  // catalog feed use.
  const vitrineId = await getLegacyVitrineId();
  const [activeRaw, reserve, withLink] = await Promise.all([
    prisma.vitrineSelection.findMany({
      where: { vitrineId, status: "ACTIVE" },
      orderBy: { score: "desc" },
      include: {
        merchantListing: {
          select: {
            canonicalProduct: { select: { title: true, publicSlug: true } },
            vitrineLink: { select: { status: true } },
            monetizationScore: { select: { components: true } },
            trend: { select: { direction: true } },
          },
        },
      },
    }),
    prisma.vitrineSelection.count({ where: { vitrineId, status: "RESERVE" } }),
    // Site-wide on purpose (VitrineLink has no vitrineId — the same real
    // link is reusable across vitrines over time by design, see
    // prisma/schema.prisma's own doc comment): a general infrastructure
    // health count, not a Vitrine-Geral-specific one.
    prisma.vitrineLink.count({ where: { status: "ACTIVE" } }),
  ]);

  // One real-data lookup per item (price/image come from the same query
  // the live product page uses — never duplicated/estimated here).
  const active = await Promise.all(
    activeRaw.map(async (row) => {
      const slug = row.merchantListing.canonicalProduct?.publicSlug;
      const product = slug ? await loadPublicMerchantProduct(slug).catch(() => null) : null;
      return { row, product };
    }),
  );

  const pendingLink = active.filter(
    (a) => a.row.merchantListing.vitrineLink?.status !== "ACTIVE",
  ).length;

  // Owner's directive, 2026-11-21 ("Transparência das comissões —
  // aprovado"): real percentual breakdown across the 30 active products,
  // by the EXISTING commission evidence types (never a new taxonomy).
  const commissionTypes = active
    .map((a) => (a.row.scoreBreakdown as { commissionEvidence?: { type?: CommissionEvidenceType } } | null)?.commissionEvidence?.type)
    .filter((t): t is CommissionEvidenceType => Boolean(t));
  const commissionFreshness = summarizeCommissionFreshness(commissionTypes);
  const [lastRun, lastDiscovery, lastTrendRollup, lastCreativeFactory, lastMetaSpendSync] = await Promise.all([
    prisma.automationRun.findFirst({ where: { job: "VITRINE_RENEW" }, orderBy: { startedAt: "desc" } }),
    prisma.automationRun.findFirst({ where: { job: "VITRINE_DISCOVERY" }, orderBy: { startedAt: "desc" } }),
    prisma.automationRun.findFirst({ where: { job: "ML_TREND_ROLLUP" }, orderBy: { startedAt: "desc" } }),
    prisma.automationRun.findFirst({ where: { job: "VITRINE_CREATIVE_FACTORY" }, orderBy: { startedAt: "desc" } }),
    prisma.automationRun.findFirst({ where: { job: "VITRINE_META_SPEND_SYNC" }, orderBy: { startedAt: "desc" } }),
  ]);

  const renewMeta = lastRun?.metadata as {
    // Owner's authorization, 2026-11-22 ("Corrigir a competição
    // comercial"): group is now a descriptive label, never a quota —
    // `target`/`filled` removed, replaced by `eligible`/`selected`.
    groupReport?: { group: string; eligible: number; selected: number; reason: string | null }[];
    funnel?: {
      foundInDatabase: number;
      afterDedup: number;
      discardedIneligible: number;
      discardedNoPrice: number;
      evaluated: number;
      selected: number;
    };
    discarded?: { title: string; reason: string; detail: string }[];
    activeEvents?: { name: string; stage: string; daysUntilPeak: number }[];
    rotationStability?: {
      weeklyLimit: number;
      recentEntriesLast7d: number;
      weeklyBudgetRemainingBeforeThisRun: number;
      dailyLimit: number;
      rotationBudgetUsedThisRun: number;
      invalidRemovedImmediately: number;
      protectedByMinObservation: number;
      deferredByExhaustedBudget: number;
      minObservationDays: number;
    };
  } | null;

  const creativeFactoryMeta = lastCreativeFactory?.metadata as {
    generated?: number;
    priceOnlyUpdates?: number;
    skipped?: number;
    rejected?: number;
    stoppedReason?: string;
    budgetStoppedEarly?: string;
  } | null;

  const discoveryMeta = lastDiscovery?.metadata as {
    eventSearches?: {
      eventName: string;
      eventType: string;
      mechanism: string;
      stage: string;
      daysUntilPeak: number;
      keywordsSearched: string[];
      categoriesScanned: string[];
      resultsFound: number;
      created: number;
      updated: number;
      errors: number;
    }[];
    trendingKeywordsScanned?: string[];
    trendingResultsFound?: number;
  } | null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <p className="text-sm">
        <a href="/admin" className="text-brand underline">
          ← Admin
        </a>
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Vitrine Inteligente</h1>
      <p className="text-foreground/70 mt-2 text-sm leading-relaxed">
        Seleção combina a pontuação de monetização real (demanda, comissão,
        qualidade) com o motor sazonal (calendário comercial, 15/30/45/60
        dias de antecedência), a tendência de ranking (7d/30d/90d) e a
        descoberta ampliada (categorias sazonais + palavras-chave em alta,
        não só o que já estava cadastrado). Catálogo e redirecionamento
        usam a etiqueta <strong>vitrinedinamica</strong>, separada do link
        do site.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Ativos" value={active.length} />
        <Stat label="Com link gerado" value={withLink} />
        <Stat label="Pendentes de link" value={pendingLink} />
        <Stat label="Em reserva" value={reserve} />
      </div>

      {/* Owner's directive, 2026-11-21 ("Transparência das comissões —
          aprovado"): real breakdown of the 30 active products by
          commission evidence type — never presented as guaranteed
          revenue, just the real distribution of how fresh/stale/unknown
          the underlying data is. */}
      {commissionFreshness.total > 0 && (
        <div className="border-border-subtle mt-4 rounded-lg border p-3">
          <h2 className="text-sm font-semibold">Frescor da comissão nos 30 ativos</h2>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
            {(Object.keys(COMMISSION_TYPE_LABELS) as CommissionEvidenceType[])
              .filter((type) => commissionFreshness.counts[type] > 0)
              .map((type) => (
                <li key={type}>
                  <strong>{commissionFreshness.percents[type]}%</strong> {COMMISSION_TYPE_LABELS[type]} ({commissionFreshness.counts[type]})
                </li>
              ))}
          </ul>
          <p className="text-foreground/60 mt-2 text-xs">
            Nenhuma estimativa de comissão é tratada como receita garantida — e
            potencial publicitário continua sendo apresentado só como
            hipótese, nunca como desempenho comprovado, enquanto não houver
            dado real de campanha.
          </p>
        </div>
      )}

      {/* Owner's requirement, 2026-11-20 ("Ordem de Execução", section
          13): monitoramento consolidado da operação — última execução
          real de cada job do pipeline, não só a renovação. Lido direto do
          AutomationRun de cada job, nenhum dado inventado quando um job
          ainda não rodou. */}
      <div className="border-border-subtle mt-4 rounded-lg border p-3">
        <h2 className="text-sm font-semibold">Status operacional do pipeline</h2>
        <ul className="mt-2 space-y-1 text-xs">
          <JobStatusRow label="Descoberta comercial (VITRINE_DISCOVERY)" run={lastDiscovery} />
          <JobStatusRow label="Tendência de ranking (ML_TREND_ROLLUP)" run={lastTrendRollup} />
          <JobStatusRow label="Seleção/renovação (VITRINE_RENEW)" run={lastRun} />
          <JobStatusRow label="Fábrica de criativos (VITRINE_CREATIVE_FACTORY)" run={lastCreativeFactory} />
          <JobStatusRow label="Sincronização de gasto Meta (VITRINE_META_SPEND_SYNC)" run={lastMetaSpendSync} />
        </ul>
        {creativeFactoryMeta && (
          <p className="text-foreground/60 mt-2 text-xs">
            Última fábrica de criativos: {creativeFactoryMeta.generated ?? 0} gerado(s), {creativeFactoryMeta.priceOnlyUpdates ?? 0} atualização(ões) só de preço (sem custo novo), {creativeFactoryMeta.rejected ?? 0} reprovado(s) pela checagem de qualidade.
            {creativeFactoryMeta.stoppedReason && ` Interrompido: ${creativeFactoryMeta.stoppedReason}.`}
            {creativeFactoryMeta.budgetStoppedEarly && ` Parou por orçamento: ${creativeFactoryMeta.budgetStoppedEarly}.`}
          </p>
        )}
      </div>

      {renewMeta?.rotationStability && (
        <div className="border-border-subtle mt-4 rounded-lg border p-3">
          <h2 className="text-sm font-semibold">Estabilidade da rotação comercial</h2>
          <p className="text-foreground/70 mt-1 text-xs">
            Limite semanal de referência: {renewMeta.rotationStability.weeklyLimit} substituições/semana (10% da capacidade) —{" "}
            {renewMeta.rotationStability.recentEntriesLast7d} entrada(s) nos últimos 7 dias, {renewMeta.rotationStability.weeklyBudgetRemainingBeforeThisRun} de orçamento restante antes desta rodada.
            Nesta rodada: {renewMeta.rotationStability.rotationBudgetUsedThisRun} substituição(ões) discricionária(s) usada(s), {renewMeta.rotationStability.invalidRemovedImmediately} oferta(s) inválida(s) removida(s) imediatamente (nunca contam no orçamento),{" "}
            {renewMeta.rotationStability.protectedByMinObservation} protegida(s) por tempo mínimo de observação (&lt;{renewMeta.rotationStability.minObservationDays} dias), {renewMeta.rotationStability.deferredByExhaustedBudget} adiada(s) por orçamento semanal esgotado.
          </p>
        </div>
      )}

      <p className="text-foreground/60 mt-4 text-xs">
        Última renovação:{" "}
        {lastRun
          ? `${lastRun.startedAt.toLocaleString("pt-BR")} — ${lastRun.status}`
          : "ainda não rodou"}
      </p>

      {renewMeta?.groupReport && (
        <div className="mt-3 space-y-1">
          {renewMeta.groupReport.map((g) => (
            <p key={g.group} className="text-xs">
              <strong>{GROUP_LABEL[g.group] ?? g.group}:</strong> {g.selected} selecionado(s) de {g.eligible} elegível(eis)
              {g.reason && (
                <span className="text-amber-700 dark:text-amber-400"> — {g.reason}</span>
              )}
            </p>
          ))}
        </div>
      )}

      {renewMeta?.funnel && (
        <div className="border-border-subtle mt-4 rounded-lg border p-3">
          <h2 className="text-sm font-semibold">Funil da última seleção</h2>
          <p className="text-foreground/70 mt-1 text-xs">
            Encontrados no banco: {renewMeta.funnel.foundInDatabase} → depois de
            deduplicar (mesmo produto, anúncios/catálogos diferentes):{" "}
            {renewMeta.funnel.afterDedup} → descartados por não serem elegíveis
            para anúncio: {renewMeta.funnel.discardedIneligible} → descartados
            por não terem preço confirmado: {renewMeta.funnel.discardedNoPrice} →
            avaliados de fato: {renewMeta.funnel.evaluated} → selecionados:{" "}
            {renewMeta.funnel.selected}.
          </p>
        </div>
      )}

      {discoveryMeta?.eventSearches && discoveryMeta.eventSearches.length > 0 && (
        <div className="border-border-subtle mt-4 rounded-lg border p-3">
          <h2 className="text-sm font-semibold">
            Pesquisas por evento comercial (última VITRINE_DISCOVERY
            {lastDiscovery && ` — ${lastDiscovery.startedAt.toLocaleString("pt-BR")}`})
          </h2>
          <ul className="mt-2 space-y-2">
            {discoveryMeta.eventSearches.map((e) => (
              <li key={e.eventName} className="text-xs">
                <strong>{e.eventName}</strong> ({e.eventType}, {e.stage}, pico em {e.daysUntilPeak}d) —{" "}
                {e.mechanism === "keyword_search" ? (
                  <>buscou por: {e.keywordsSearched.map((k) => `"${k}"`).join(", ")}</>
                ) : (
                  <>varreu {e.categoriesScanned.length} categoria(s) bestseller real (sem usar o nome do evento como palavra-chave)</>
                )}{" "}
                → {e.resultsFound} resultado(s) reais encontrados, {e.created} novo(s), {e.updated} já conhecido(s)
                {e.errors > 0 && `, ${e.errors} erro(s)`}.
              </li>
            ))}
          </ul>
          {discoveryMeta.trendingKeywordsScanned && (
            <p className="text-foreground/60 mt-2 text-xs">
              Varredura cross-category (palavras em alta no próprio Mercado
              Livre, independente do calendário):{" "}
              {discoveryMeta.trendingKeywordsScanned.map((k) => `"${k}"`).join(", ")} →{" "}
              {discoveryMeta.trendingResultsFound ?? 0} resultado(s) reais.
            </p>
          )}
        </div>
      )}

      {renewMeta?.discarded && renewMeta.discarded.length > 0 && (
        <details className="border-border-subtle mt-4 rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            Descartados nesta rodada ({renewMeta.discarded.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {renewMeta.discarded.map((d, i) => (
              <li key={i} className="text-foreground/70 text-xs">
                <strong>{d.title}</strong> —{" "}
                {d.reason === "sem_preco_confirmado"
                  ? "sem preço confirmado"
                  : d.reason === "duplicado_familia"
                    ? "duplicado (família comercial)"
                    : "inelegível para anúncio"}
                : {d.detail}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-4 flex flex-wrap gap-2">
        <a
          href="/admin/vitrine-links"
          className="bg-brand text-brand-foreground inline-block rounded-lg px-4 py-2 text-sm font-semibold"
        >
          Gerar links pendentes ({pendingLink}) →
        </a>
        <a
          href="/admin/vitrine-financeiro"
          className="border-border-subtle hover:border-brand inline-block rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Financeiro →
        </a>
        <a
          href="/admin/vitrine-inteligente/simulacao"
          className="border-border-subtle hover:border-brand inline-block rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Simulação Facebook/Instagram →
        </a>
        <a
          href="/admin/laboratorio"
          className="border-border-subtle hover:border-brand inline-block rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Laboratório de Inteligência Comercial →
        </a>
        <a
          href="/admin/cerebro-comercial"
          className="border-border-subtle hover:border-brand inline-block rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Cérebro Comercial →
        </a>
        <a
          href="/admin/vitrine-criativos"
          className="border-border-subtle hover:border-brand inline-block rounded-lg border px-4 py-2 text-sm font-semibold"
        >
          Fábrica de Criativos →
        </a>
      </p>

      <p className="mt-3 text-sm">
        Catálogo Meta:{" "}
        <a
          href="/catalogo/mercado-livre.xml"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand underline"
        >
          /catalogo/mercado-livre.xml
        </a>
      </p>

      <h2 className="mt-8 text-lg font-semibold">Produtos ativos</h2>
      <p className="text-foreground/60 mt-6 text-xs">
        Prévia da arte publicitária gerada automaticamente (modelo fixo,
        sem IA generativa — foto real + preço atual + desconto só quando
        comprovado pelo próprio Mercado Livre). Atualiza sozinha a cada
        acesso, nunca precisa ser regerada manualmente.
      </p>
      <ul className="mt-3 space-y-3">
        {active.map(({ row, product }) => {
          const linkOk = row.merchantListing.vitrineLink?.status === "ACTIVE";
          const trendDirection = row.merchantListing.trend?.direction;
          const breakdown = row.scoreBreakdown as {
            rankingScore?: number;
            matchedEventName?: string | null;
            matchedKeyword?: string | null;
            commissionEvidence?: { type: CommissionEvidenceType; rate: number | null; estimatedValueBrl: number | null; stale: boolean };
            priceCompetitiveness?: { score: number | null; siblingOfferCount: number; hasConfirmedPriceDrop: boolean };
            adPotentialHypothesis?: { impulseFit: string; impulseFitReason: string; offerClarity: string; hasVisibleDiscountHook: boolean };
          } | null;
          return (
            <li
              key={row.id}
              className="border-border-subtle flex flex-col gap-3 rounded-lg border p-3 text-sm sm:flex-row"
            >
              {linkOk ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/vitrine/creative/${row.merchantListingId}`}
                  alt=""
                  width={120}
                  height={120}
                  className="h-28 w-28 shrink-0 rounded-md border border-border-subtle object-cover"
                />
              ) : product?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.imageUrl}
                  alt=""
                  width={120}
                  height={120}
                  className="h-28 w-28 shrink-0 rounded-md border border-border-subtle object-cover opacity-60"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {row.merchantListing.canonicalProduct?.title ?? "(sem título)"}
                </p>
                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-foreground/70 sm:grid-cols-3">
                  <div>
                    <dt className="inline text-foreground/50">Preço atual: </dt>
                    <dd className="inline">{brl(product?.currentPrice ?? null)}</dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/50">Comissão: </dt>
                    <dd className="inline">
                      {formatCommissionEvidence(breakdown?.commissionEvidence, brl)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/50">Competitividade de preço: </dt>
                    <dd className="inline">
                      {breakdown?.priceCompetitiveness?.score != null
                        ? `${breakdown.priceCompetitiveness.score}/100 (vs. ${breakdown.priceCompetitiveness.siblingOfferCount} outras ofertas)${breakdown.priceCompetitiveness.hasConfirmedPriceDrop ? " · desconto comprovado" : ""}`
                        : "sem outras ofertas para comparar"}
                    </dd>
                  </div>
                  {breakdown?.adPotentialHypothesis && (
                    <div>
                      <dt className="inline text-foreground/50">Potencial publicitário (hipótese): </dt>
                      <dd className="inline" title={breakdown.adPotentialHypothesis.impulseFitReason}>
                        impulso {breakdown.adPotentialHypothesis.impulseFit} · oferta {breakdown.adPotentialHypothesis.offerClarity}
                        {breakdown.adPotentialHypothesis.hasVisibleDiscountHook ? " · com desconto comprovado" : ""}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-foreground/50">Pontuação (ranking): </dt>
                    <dd className="inline">
                      {breakdown?.rankingScore ?? Math.round(row.score)} (nota bruta {Math.round(row.score)})
                    </dd>
                  </div>
                  {breakdown?.matchedEventName && (
                    <div>
                      <dt className="inline text-foreground/50">Evento/palavra-chave: </dt>
                      <dd className="inline">
                        {breakdown.matchedEventName} ({breakdown.matchedKeyword})
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-foreground/50">Classificação: </dt>
                    <dd className="inline">{GROUP_LABEL[row.groupType] ?? row.groupType}</dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/50">Tendência de ranking: </dt>
                    <dd className="inline">{trendDirection ?? "sem histórico ainda"}</dd>
                  </div>
                  <div>
                    <dt className="inline text-foreground/50">Link vitrinedinamica: </dt>
                    <dd className="inline">{linkOk ? "ativo" : "pendente"}</dd>
                  </div>
                </dl>
                <p className="text-foreground/60 mt-1 text-xs">
                  <strong>Motivo da seleção:</strong> {row.reason}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {active.length === 0 && (
        <p className="text-foreground/60 mt-3 text-sm">
          Nenhum produto ativo ainda — rode o job VITRINE_RENEW.
        </p>
      )}
    </div>
  );
}

function JobStatusRow({ label, run }: { label: string; run: { startedAt: Date; status: string; finishedAt: Date | null } | null }) {
  const problematic = run && (run.status === "FAILED" || run.status === "PARTIAL");
  const neverRan = !run;
  return (
    <li className="flex items-baseline justify-between gap-2">
      <span>{label}</span>
      <span className={problematic || neverRan ? "text-amber-700 dark:text-amber-400" : "text-foreground/70"}>
        {run ? `${run.startedAt.toLocaleString("pt-BR")} — ${run.status}` : "nunca rodou"}
      </span>
    </li>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border-subtle rounded-lg border p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-foreground/60 text-xs">{label}</p>
    </div>
  );
}
