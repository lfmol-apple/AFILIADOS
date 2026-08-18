# Growth metrics

Define os indicadores que vamos observar depois que a primeira coorte real for publicada — não
implementa nenhum dashboard novo além do que já existe (`/admin`, `docs/ANALYTICS.md`). A maior
parte dos números do PreçoCaindo já é coletada hoje; o que falta são os números do lado de fora
(Google Search Console, relatórios Amazon), que só existirão depois da publicação.

## KPIs

| KPI | Fonte | Hoje |
| --- | --- | --- |
| Organic Impressions | Google Search Console (Performance) | Não existe até o site ser indexado |
| Organic Clicks | Google Search Console | Não existe até o site ser indexado |
| Organic CTR | Search Console (cliques / impressões) | Não existe até o site ser indexado |
| Average Position | Search Console | Não existe até o site ser indexado |
| Indexed Product Pages | Search Console (Cobertura/Páginas) + `sitemap.xml` | `sitemap.xml` já é dataSource-aware (`app/sitemap.ts`) — só falta ter páginas para listar |
| Product Page Views | `PageView` (`pageType="product"`) | **Já coletado** — `lib/queries/admin.ts#getTrafficOverview` |
| Affiliate Clicks | `AffiliateClick` | **Já coletado** — `getTrafficOverview`, `getWeeklyStats` |
| Affiliate CTR | clicks / product page views | **Já calculado** (site-wide) — `getTrafficOverview().ctr` |
| Amazon Orders | Painel de Associados da Amazon (relatório manual, com atraso) | Não integrado — leitura manual do painel Amazon |
| Amazon Conversion | pedidos Amazon / cliques PreçoCaindo, quando disponível | Nunca por usuário individual — só agregado por dia/categoria (ver "Limitações" abaixo) |
| Commission Revenue | Painel de Associados da Amazon | Não integrado — leitura manual |
| RPM (Revenue per 1.000 Sessions) | calculado, ver fórmula abaixo | Depende de Commission Revenue |
| Revenue per Affiliate Click | calculado, ver fórmula abaixo | Depende de Commission Revenue |

## Fórmulas

```text
RPM = (receita de comissão do período / sessões do período) * 1000
```

Este é um dos indicadores econômicos principais do projeto — mede quanto o site gera por
milhar de sessões, comparável entre categorias/produtos/páginas independente de volume absoluto.

```text
Revenue per Affiliate Click = receita de comissão do período / affiliate clicks do período
```

"Sessões" hoje = contagem de `PageView` distintas por `sessionId` pseudônimo no período (ver
docs/ANALYTICS.md) — não um conceito importado de uma ferramenta externa.

## Limitações de atribuição — documentadas, não fingidas

- A Amazon **não** fornece um relatório de pedidos em tempo real nem por clique individual —
  apenas um relatório agregado, com atraso (normalmente 24-48h, variável). **Nunca tentaremos
  reconciliar um pedido específico da Amazon com um `AffiliateClick` específico do PreçoCaindo.**
  Toda análise de conversão/receita é agregada por dia, por coorte de lançamento, ou por
  categoria — nunca por usuário.
- Google Search Console mede impressões/cliques/posição por **página/query**, não por sessão —
  não há como cruzar uma impressão do Google com uma sessão específica do PreçoCaindo. O que dá
  para combinar é: "esta página teve N impressões no Google esta semana" + "esta página teve M
  page views + K affiliate clicks no PreçoCaindo esta semana" — dois números lado a lado, nunca
  uma junção real.
- Nenhum dos três sistemas (Google, PreçoCaindo, Amazon) compartilha um identificador comum de
  sessão/usuário — e isso é deliberado (sem fingerprinting, sem IP armazenado, ver
  docs/ANALYTICS.md). A visão combinada é sempre um "lado a lado" de três painéis, nunca uma
  atribuição unificada.

## Progressão conceitual — "estamos entrando no jogo?"

A ausência de vendas não é falha enquanto ainda não houver tráfego suficiente para gerá-las. As
fases abaixo existem para que a leitura do progresso seja pela fase certa, não pela fase 9 sendo
comparada contra a fase 1:

```text
FASE 1 — páginas indexadas (Search Console: Cobertura)
FASE 2 — impressões orgânicas (Search Console: Performance)
FASE 3 — cliques orgânicos (Search Console: Performance)
FASE 4 — cliques afiliados (AffiliateClick, /admin)
FASE 5 — primeiro pedido atribuído (relatório manual da Amazon)
FASE 6 — primeira comissão (relatório manual da Amazon)
FASE 7 — vendas recorrentes (mesma categoria/produto, mês a mês)
FASE 8 — identificar clusters vencedores (categoria/tipo de produto com melhor RPM)
FASE 9 — escalar vencedores (mais produtos naquele cluster, deliberadamente)
```

Antes da Fase 4 ter volume razoável, não há dado suficiente para julgar Fases 5+ — não é
"o negócio não funciona", é "ainda não há tráfego para saber".

## O que já existe hoje (sem sprint nova)

- `/admin` → Visão geral: pageviews, buscas, cliques, CTR do dia (`getTrafficOverview`).
- `/admin` → topProductsByClicks, topPagesByClicks, 7 dias (`getWeeklyStats`).
- `SearchEvent` já alimenta o Demand Engine com termos buscados e buscas sem resultado
  (docs/DEMAND_ENGINE.md).
- `app/sitemap.ts`/`app/robots.ts` já são dataSource-aware — nenhuma ação nova necessária para a
  Fase 1 alem de ligar os flags (ver docs/LAUNCH_CHECKLIST.md).
