import type { Metadata } from "next";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { AdminLoginForm } from "@/components/admin-login-form";
import {
  StatCard,
  StatusPill,
  DashboardGroup,
  SubSection,
} from "@/components/admin/dashboard-ui";
import { getBrazilAmazonStatus } from "@/lib/amazon/status";
import {
  checkLiveActivationReadiness,
  isPolicyReviewRecent,
} from "@/lib/amazon/policy-guard";
import { getAmazonApiPathSnapshot } from "@/lib/queries/amazon-api-path";
import {
  AMAZON_REQUIRED_DISCLOSURE,
  amazonDisclosure,
  isDisclosureCompliant,
} from "@/lib/amazon/disclosure";

export const metadata: Metadata = {
  title: "Amazon — caminho para a API — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const REVIEWED_ON = "20/09/2026";

const SOURCES = [
  {
    label: "Documentação oficial da Creators API (Associates Central)",
    href: "https://affiliate-program.amazon.com/creatorsapi/docs/en-us/introduction",
  },
  {
    label: "Políticas do Programa de Associados — Amazon Brasil",
    href: "https://associados.amazon.com.br/help/operating/policies/",
  },
  {
    label: "Atualizações do Acordo Operacional (vigência 14/04/2026)",
    href: "https://associados.amazon.com.br/help/operating/compare",
  },
  {
    label: "Ajuda — API de divulgação de produtos (Brasil)",
    href: "https://associados.amazon.com.br/help/topic/paapi",
  },
];

interface Criterion {
  title: string;
  detail: string;
  source: string;
  /** "auto" is computed from this app; "manual" only Amazon can confirm. */
  kind: "auto" | "manual";
  done?: boolean;
}

export default async function AmazonApiPathPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await isAdminRequestAuthorized(sessionToken))) {
    return <AdminLoginForm />;
  }

  const status = getBrazilAmazonStatus();
  const readiness = checkLiveActivationReadiness("BR");
  const policyRecent = isPolicyReviewRecent();
  const snapshot = await getAmazonApiPathSnapshot();

  const disclosureOk = isDisclosureCompliant();
  const criteria: Criterion[] = [
    {
      title: "Aviso de afiliado com o texto exato exigido pela Amazon",
      detail: disclosureOk
        ? "O texto configurado confere com o exigido."
        : `Configurado: "${amazonDisclosure}". Exigido: "${AMAZON_REQUIRED_DISCLOSURE}". Ajuste AMAZON_ASSOCIATE_DISCLOSURE no .env de produção.`,
      source: "Acordo Operacional / Políticas — declaração obrigatória",
      kind: "auto",
      done: disclosureOk,
    },
    {
      title:
        "Página pública com conteúdo original e links (a Amazon avalia o site público)",
      detail:
        "A seleção com análise própria fica em /achados, aberta a qualquer visitante, sem login, com o aviso em destaque.",
      source: "Políticas — site publicamente disponível e conteúdo original",
      kind: "auto",
      done: true,
    },
    {
      title: "Tracking ID da candidatura atual configurado",
      detail: `Links Amazon só são gerados com o Tracking ID atribuído pela Amazon (${status.trackingId}).`,
      source: "Políticas — formato do link com Associate ID",
      kind: "auto",
      done: status.trackingIdConfigured,
    },
    {
      title:
        "Conta de Associados aprovada (3 vendas qualificadas em até 180 dias do cadastro)",
      detail:
        "Regra de aprovação da conta, anterior à API. Confirme no painel de Associados — fonte secundária, verifique o prazo da sua própria conta.",
      source: "Central de Associados / FAQ de candidaturas",
      kind: "manual",
    },
    {
      title:
        "Mínimo de 10 vendas qualificadas nos últimos 30 dias (janela móvel)",
      detail:
        "É o requisito da Creators API. Sem isso as chamadas retornam AssociateNotEligible. Cliques e pedidos do painel NÃO provam isso — só a confirmação da Amazon.",
      source: "Documentação oficial da Creators API",
      kind: "manual",
      done: status.qualifiedSalesRequirementMet,
    },
    {
      title: "Conta aprovada na página da Creators API e credenciais geradas",
      detail:
        "Gerar credenciais na Central de Associados. Até 48h para reavaliar a elegibilidade; até duas aplicações com dois conjuntos de credenciais cada.",
      source: "Documentação oficial da Creators API",
      kind: "manual",
      done: status.creatorsApiAccountApproved,
    },
    {
      title: "Manter as 10 vendas/30 dias depois de liberada",
      detail:
        "Se o volume cair abaixo do mínimo o acesso é suspenso e volta quando o volume é retomado. A taxa de requisições também sobe/desce com as vendas dos últimos 30 dias.",
      source: "Ajuda — API de divulgação de produtos (Brasil)",
      kind: "manual",
    },
  ];

  const writingRules = [
    {
      rule: "Conteúdo original com valor adicional",
      how: "Cada texto precisa de comentário, análise ou transformação própria (critérios, comparação, uso real). Lista de ASINs + descrição copiada não conta — regra explícita no Acordo vigente desde 14/04/2026.",
    },
    {
      rule: "Link sempre com o Tracking ID, sem esconder a origem",
      how: "Usar o link com a marcação da Amazon, acessado direto do site (é o que /achados faz: link normal amazon.com.br/dp/ASIN com o Tracking ID visível na URL). Sem redirecionamentos que disfarcem a origem. Ponto de atenção: /go/amazon/[asin] é um redirecionamento interno que preserva a tag — manter a revisão jurídica em aberto.",
    },
    {
      rule: "Aviso de afiliado perto de cada link",
      how: 'Texto exigido: "Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas." Deve aparecer de forma clara e destacada — use <AffiliateDisclosure prominent /> no topo de qualquer página de links Amazon.',
    },
    {
      rule: "Sem preço, imagem ou dado da Amazon sem a API",
      how: "Imagens não podem ser armazenadas; preço/disponibilidade só via API (cache máx. 24h) ou com data/hora visível. Até liberar a API: CTA 'Ver preço na Amazon', sem número.",
    },
    {
      rule: "Nada de informação exagerada ou incorreta",
      how: "Não afirmar preço, promoção ou política da Amazon sem fonte. Não dizer que o PreçoCaindo vende o produto.",
    },
    {
      rule: "Sem autocompra e sem anúncio pago ligado à Amazon",
      how: "Compras do dono/equipe não geram comissão; compras via anúncio pago/impulsionado ligado à Amazon foram excluídas no Acordo de 14/04/2026 (exceções limitadas). Nunca comprar termos com 'amazon'.",
    },
    {
      rule: "Dados da API não alimentam modelos de linguagem",
      how: "As políticas proíbem usar a API para desenvolver ou aprimorar LLMs/ML sem autorização escrita. Antes de ligar a API, confirmar como isso se aplica ao gerador de conteúdo (GENERATE_CONTENT).",
    },
    {
      rule: "Privacidade (LGPD) e cookies divulgados",
      how: "Já coberto em /privacidade; manter atualizado ao adicionar qualquer pixel.",
    },
  ];

  const pendingReadiness = readiness.filter((c) => !c.pass);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Amazon — caminho para a API
          </h1>
          <p className="text-foreground/50 mt-1 text-sm">
            Critérios da Amazon para liberar a Creators API e o que publicar com
            link até lá. Regras conferidas nas fontes oficiais em {REVIEWED_ON}.
          </p>
        </div>
        <a
          href="/admin"
          className="border-border-subtle hover:border-brand rounded-full border px-3 py-1.5 text-xs font-medium"
        >
          ← Admin
        </a>
      </div>

      {!policyRecent && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          ⚠️ AMAZON_POLICY_REVIEW_DATE está a mais de 90 dias. As regras abaixo
          foram reconferidas em {REVIEWED_ON}; atualize a variável de ambiente e
          docs/AMAZON_COMPLIANCE.md.
        </div>
      )}

      <DashboardGroup
        title="Onde estamos"
        description="Números reais deste sistema. Vendas qualificadas só existem no painel da Amazon."
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Cliques Amazon (30d)"
            value={snapshot.clicksLast30d}
          />
          <StatCard
            label="Cliques Amazon (total)"
            value={snapshot.clicksTotal}
          />
          <StatCard
            label="Guias/páginas publicadas"
            value={snapshot.publishedGuides}
          />
          <StatCard label="Provider" value={status.provider.toUpperCase()} />
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill
            ok={status.trackingIdConfigured}
            label={`Tracking ID: ${status.trackingId}`}
          />
          <StatusPill
            ok={status.qualifiedSalesRequirementMet}
            label={
              status.qualifiedSalesRequirementMet
                ? "10 vendas/30d confirmadas"
                : "10 vendas/30d NÃO confirmadas"
            }
          />
          <StatusPill
            ok={status.creatorsApiAccountApproved}
            label={
              status.creatorsApiAccountApproved
                ? "Creators API aprovada"
                : "Creators API NÃO aprovada"
            }
          />
        </div>
        <SubSection title="Produtos Amazon BR por origem do dado">
          {snapshot.productsBySource.length === 0 ? (
            <p className="text-foreground/50 text-sm">
              Nenhum produto Amazon cadastrado.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {snapshot.productsBySource.map((r) => (
                <li key={r.dataSource} className="flex justify-between gap-3">
                  <span>{r.dataSource}</span>
                  <span className="font-medium">
                    {r.active} ativos / {r.total} total
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SubSection>
      </DashboardGroup>

      <DashboardGroup
        title="Critérios para liberar a API"
        description="Creators API substitui a PA-API. 'auto' é calculado aqui; 'manual' só a Amazon confirma."
      >
        <ol className="space-y-3">
          {criteria.map((c, i) => (
            <li key={i} className="border-border-subtle rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-medium">{c.title}</div>
                <StatusPill
                  ok={c.done === true}
                  label={
                    c.done === true
                      ? "OK"
                      : c.kind === "auto"
                        ? "Pendente"
                        : "A confirmar"
                  }
                />
              </div>
              <p className="text-foreground/60 mt-1.5 text-xs">{c.detail}</p>
              <p className="text-foreground/40 mt-1 text-xs">
                Fonte: {c.source}
              </p>
            </li>
          ))}
        </ol>
        <SubSection title="O que conta como venda qualificada">
          <ul className="text-foreground/70 list-disc space-y-1.5 pl-5 text-sm">
            <li>
              Sessão de 24h a partir do clique (ou até outro link de afiliado
              assumir a sessão).
            </li>
            <li>
              Produto físico no carrinho dentro da sessão pode ser comprado em
              até 89 dias.
            </li>
            <li>
              Envio/entrega e pagamento em até 180 dias (regra do Acordo de
              14/04/2026).
            </li>
            <li>
              Venda revertida, autocompra e compra via anúncio pago ligado à
              Amazon não contam.
            </li>
            <li>
              Comissão paga ~60 dias após o fim do mês; mínimo de R$ 30,00.
            </li>
          </ul>
        </SubSection>
        <SubSection title="Checklist técnico de ativação (BR)">
          <ul className="space-y-1.5 text-sm">
            {readiness.map((c) => (
              <li
                key={c.key}
                className="flex items-center justify-between gap-3"
              >
                <span>{c.label}</span>
                <StatusPill ok={c.pass} label={c.pass ? "PASS" : "PENDENTE"} />
              </li>
            ))}
          </ul>
          {pendingReadiness.length > 0 && (
            <p className="text-foreground/50 mt-2 text-xs">
              As credenciais só existem depois que a Amazon liberar a Creators
              API — ver critérios acima.
            </p>
          )}
        </SubSection>
      </DashboardGroup>

      <DashboardGroup
        title="Escrever sobre produtos da Amazon com link"
        description="Como gerar as 10 vendas/30 dias sem violar as políticas. Vale para cada guia, comparativo ou análise."
      >
        <div className="space-y-3">
          {writingRules.map((r) => (
            <div
              key={r.rule}
              className="border-border-subtle rounded-lg border p-4"
            >
              <div className="text-sm font-medium">{r.rule}</div>
              <p className="text-foreground/60 mt-1.5 text-xs">{r.how}</p>
            </div>
          ))}
        </div>
        <SubSection title="Roteiro sugerido">
          <ol className="text-foreground/70 list-decimal space-y-1.5 pl-5 text-sm">
            <li>
              Cadastrar produtos reais à mão (origem MANUAL_VERIFIED) com fatos
              conferidos — sem preço, sem imagem copiada.
            </li>
            <li>
              Publicar guias/comparativos com critério próprio e o aviso de
              afiliado junto de cada link (<code>/guias</code>).
            </li>
            <li>
              Acompanhar cliques Amazon aqui e as vendas qualificadas no painel
              da Amazon (nunca inferir uma coisa da outra).
            </li>
            <li>
              Ao confirmar 10 vendas em 30 dias: marcar
              AMAZON_BR_QUALIFIED_SALES_MET, gerar as credenciais e aguardar até
              48h.
            </li>
          </ol>
        </SubSection>
      </DashboardGroup>

      <DashboardGroup title="Fontes oficiais">
        <ul className="space-y-1.5 text-sm">
          {SOURCES.map((s) => (
            <li key={s.href}>
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </DashboardGroup>
    </div>
  );
}
