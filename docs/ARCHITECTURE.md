# Arquitetura

## Visão geral

```
Amazon (Creators API, quando ativa)
   │
   ▼
CommerceProvider (interface)  ───►  MockAmazonProvider | AmazonProvider
   │
   ▼
jobs/ (DISCOVER_PRODUCTS, REFRESH_*)  ───►  PostgreSQL (Prisma)
   │
   ▼
lib/services/ (PriceStats, OpportunityScore, PriceDropDetector, ProductPriorityService)
   │
   ▼
jobs/ (CALCULATE_PRICE_STATS, CALCULATE_OPPORTUNITIES, REBALANCE_PRODUCT_PRIORITIES)
   │
   ▼
lib/demand/ (DemandEngine)  ───►  SearchOpportunity (scored)
   │
   ▼
ContentProvider (interface)  ───►  MockContentProvider | OpenAI/Anthropic (stub)
   │
   ▼
ContentQualityGate + PublicationDecisionEngine
   │
   ▼
GeneratedContent (DRAFT → APPROVED/REJECTED → PUBLISHED, noindex when demand is weak)
   │
   ▼
app/ (Next.js pages)  ───►  visitante  ───►  PageView / SearchEvent (consent-aware)
   │
   ▼
/go/amazon/[asin]  ───►  AffiliateClick  ───►  redirect para a Amazon
```

O princípio central: **a UI nunca fala diretamente com a Amazon, nem com um provider de IA**. Ela
consome apenas dados já normalizados no banco. Trocar de marketplace ou de provider de conteúdo é
uma mudança de configuração (`AMAZON_PROVIDER`, `CONTENT_GENERATION`), não uma reescrita.

## Pastas

| Pasta | Responsabilidade |
| --- | --- |
| `app/` | Rotas Next.js (App Router) — Server Components, metadata, route handlers |
| `components/` | UI reutilizável, sem lógica de negócio Amazon-específica |
| `lib/config/` | `env.ts` (parse Zod de `process.env`), feature flags, thresholds de prioridade |
| `lib/providers/` | `CommerceProvider` e suas implementações (Mock, Amazon) |
| `lib/content/` | `ContentProvider` e suas implementações (Mock, OpenAI, Anthropic) |
| `lib/services/` | Lógica de domínio pura e testável (score, stats, slug, quality gate, priority, publication decision, price alert) |
| `lib/demand/` | Demand Engine — fontes de demanda e scoring (docs/DEMAND_ENGINE.md) |
| `lib/analytics/` | Registro de eventos de busca interna |
| `lib/privacy/` | `ConsentManager` — LGPD (docs/PRIVACY.md) |
| `lib/remarketing/` | `RemarketingProvider` (Noop hoje — docs/REMARKETING.md) |
| `lib/observability/` | `health.ts` (banco, migrations, automação — `/api/health`), `metrics.ts`, `logger.ts` (log estruturado mínimo, com redação automática de campos sensíveis — ver docs/OPERATIONS.md) |
| `lib/admin/auth.ts` | Autenticação por sessão do `/admin` (scrypt + cookie HttpOnly + rate limiting) — ver docs/PRODUCTION_READINESS.md "Admin security" |
| `lib/seo/` | Structured data, indexabilidade, redirects de slug |
| `lib/http/` | `RetryPolicy` genérica para chamadas externas futuras |
| `lib/config/marketplaces.ts` | `AmazonMarketplaceConfig` por marketplace (BR/US) — host, moeda, tag, enabled/apiEnabled; `PRIMARY_PUBLIC_MARKETPLACE` (BR) — o marketplace que o site público serve hoje |
| `lib/config/public-catalog.ts` | `isPublicCatalogSafeToShow()` — gate único de "é seguro mostrar o catálogo publicamente agora" (ver seção "Pré-lançamento" abaixo) |
| `lib/amazon/` | `AmazonPolicyGuard` (marketplace-aware) — única fonte de verdade sobre regras Amazon; `readiness-checks.ts`/`status.ts` para admin e production:readiness |
| `lib/queries/` | Acesso a dados usado pelas páginas (mantém Prisma fora dos componentes) — `products.ts` (público, sempre BR) e `admin.ts` (inclui `getCatalogSnapshot`/`getUnexpectedCatalogAlerts` por marketplace) |
| `lib/jobs/` | Infraestrutura compartilhada de jobs (`AutomationRun` com locking/stale recovery, `mergeJobCounters`) |
| `lib/readiness/report.ts` | `buildReadinessReport()` — lógica pura por trás de `production:readiness` (três vereditos: `SITE_LAUNCH_READY`/`CATALOG_LAUNCH_READY`/`PRODUCTION`), testável sem spawnar um processo |
| `instrumentation.ts` | Hook `register()` do Next.js — log estruturado de startup (modo do provider, geração de conteúdo, flags), sem segredos |
| `jobs/` | Os 13 jobs de automação, um arquivo por job |
| `proxy.ts` | Redirects permanentes de slug (renomeado de `middleware` no Next 16) |
| `prisma/` | Schema, migrations, seed |
| `prompts/` | Prompts versionados para geração de conteúdo |
| `types/` | Tipos compartilhados entre camadas (`commerce.ts`, `content.ts`, `marketplace.ts`) |
| `scripts/` | `amazon-compliance.ts`, `production-readiness.ts` |
| `docs/` | Esta documentação |
| `tests/` | Testes Vitest, um arquivo por serviço testado |

## Por que essa separação

- **`CommerceProvider`** existe para que o núcleo do produto (banco, score, SEO, conteúdo) nunca
  dependa da forma exata da resposta da Amazon. Adicionar um segundo marketplace é escrever um
  novo provider, não alterar `Product`, `Offer` ou as páginas.
- **`ContentProvider`** segue o mesmo padrão para geração de conteúdo — trocar de OpenAI para
  Anthropic (ou desligar geração) é uma variável de ambiente. Só recebe `VerifiedFacts`
  (`types/content.ts`), nunca dados soltos — ver docs/CONTENT_ENGINE.md.
- **`AmazonPolicyGuard`** centraliza toda regra de compliance (host permitido, tag de afiliado,
  disclosure) para que nenhuma outra parte do código precise "lembrar" da regra — ela só pode
  chamar o guard. É marketplace-aware desde a Sprint 3: toda função aceita qual marketplace está
  em jogo e rejeita um marketplace desabilitado antes mesmo de validar o host, então BR e US nunca
  podem se confundir (`lib/config/marketplaces.ts` é a única fonte de verdade sobre qual
  marketplace está habilitado e com qual tag — ver docs/AMAZON.md).
- **`ProductPriorityService` + `RefreshPlanner`** separam "o que mudou de prioridade" (sinais
  reais: score, queda, cliques, disponibilidade) de "quanto orçamento de chamadas temos" — a
  primeira decide HOT/WARM/COLD, a segunda decide a ordem da fila dentro do orçamento disponível,
  sem nunca hardcodar uma frequência incompatível com limites da Amazon ainda não confirmados.
- **`DemandEngine` + `PublicationDecisionEngine`** separam "este produto é uma boa oportunidade de
  preço" (Opportunity Score) de "vale a pena escrever/indexar uma página sobre isso" (demanda +
  qualidade + originalidade). Nenhuma automação publica só porque um ASIN existe.
- **Jobs vs. páginas**: páginas fazem leitura (read-only) de dados já calculados; toda escrita
  (descoberta, refresh de preço, cálculo de score, geração de conteúdo) acontece em jobs
  observáveis via `AutomationRun`, com lock contra execução concorrente e recuperação automática
  de lock travado. Isso é o que torna a operação diária "sem toque manual" (seção 2 do briefing).

## Modelo de dados (resumo)

`Product` → `Offer[]` (snapshot de cada observação de preço/disponibilidade) → `PriceHistory[]`
(série temporal usada para o gráfico e as estatísticas) → `PriceStats` (agregação cacheada) →
`OpportunityScore` (0-100, com sub-notas). `Product.updatePriority` + `priorityUpdatedAt`
alimentam o `ProductPriorityService`. `SearchOpportunity` carrega o breakdown do `DemandEngine`
(`demandScore`, `commercialScore`, `freshnessScore`, `contentGapScore`, `overallScore`).
`GeneratedContent` é independente de `Product` por `entityId` solto (não FK) porque também cobre
`BEST_OF`/`COMPARISON`/`CATEGORY`, que não têm um único produto dono; carrega `qualityBreakdown`,
`contentHash` (deduplicação) e `noindex`. `AutomationRun` registra cada execução de job.
`AffiliateClick`, `PageView` e `SearchEvent` registram atividade sem dado pessoal.
`ConsentRecord` guarda a escolha de privacidade por sujeito pseudônimo. `SlugRedirect` registra
redirects permanentes. `AdminSession` guarda só o hash do token de sessão do `/admin` (o token bruto
existe apenas no cookie HttpOnly); `AdminLoginAttempt` guarda tentativas de login por hash de IP,
para rate limiting — nenhuma das duas tabelas guarda dado sensível em texto puro. Veja
`prisma/schema.prisma` para os campos completos.

### Isolamento por marketplace (Sprint 4)

`Product.marketplace` (enum `BR`/`US`, padrão `BR`) faz de `Product` um registro **por
marketplace** — a listagem BR e uma futura listagem US do "mesmo" ASIN são duas linhas `Product`
distintas, cada uma com seu próprio conjunto completo de `Offer`/`PriceHistory`/`PriceStats`/
`OpportunityScore` (chave única passou de `[provider, asin]` para `[provider, marketplace,
asin]`). Essa é a decisão deliberada em vez de um `ProductMaster` global: como todo filho é 1:1/1:N
via `productId`, o isolamento de preço/moeda é automático pela própria FK — não existe uma linha
compartilhada por onde dado de um marketplace possa vazar para o outro, e nenhuma tabela filha
precisou ganhar sua própria coluna `marketplace` redundante. `AffiliateClick`, `PriceAlert`,
`Creative`, `SearchOpportunity` e `PageView` seguem o mesmo raciocínio — o marketplace é sempre
derivável sem ambiguidade via `Product`.

`GeneratedContent` é a exceção deliberada: como referencia sua entidade por `entityId` solto (não
FK), não há como derivar marketplace via relação, e o pipeline editorial inteiro (`ContentQualityGate`,
geração, publicação) ainda é hardcoded para BR — ver `jobs/discover-content-opportunities.ts`. Não
ganhou uma coluna `marketplace` nesta sprint porque não há hoje nenhum caminho que produza conteúdo
não-BR; revisitar juntos quando/se a geração de conteúdo também for multi-marketplace.

Toda query que alimenta uma página pública (`lib/queries/products.ts`) filtra explicitamente por
`PRIMARY_PUBLIC_MARKETPLACE` (hoje `"BR"`), mesmo onde isso hoje parece redundante — é o que
impede um produto USD de aparecer silenciosamente no site BR no dia em que o US for habilitado.
`getCommerceProvider(marketplace)` e os jobs de catálogo (`DISCOVER_PRODUCTS`,
`REFRESH_*`, `CALCULATE_*`, `REBALANCE_*`) recebem o marketplace explicitamente e iteram sobre
`getEnabledMarketplaces()` — hoje sempre `["BR"]`, já preparado para adicionar `"US"` sem reescrever
nada além de configuração.

### URLs e slugs — hoje e estratégia futura para US

As URLs públicas BR (`/produto/[slug]`, `/categorias/[slug]`, `/melhores/[slug]`,
`/comparar/[slug]`, `/go/amazon/[asin]`) permanecem **sem prefixo**, exatamente como estão — esta
sprint não move nem redireciona nenhuma URL existente. `Product.slug` é único globalmente (não só
por marketplace), então uma futura listagem US do mesmo produto vai precisar de um slug distinto
mesmo com o mesmo `title` de origem.

Estratégia documentada (não implementada) para quando o US for habilitado: URLs US usariam um
prefixo explícito (`/us/produto/[slug]`, `/us/ofertas`, etc.), análogo ao padrão já usado em
`/go/amazon/[marketplace]/[asin]` para o link de afiliado. Isso evita qualquer colisão de rota com
as URLs BR existentes e deixa claro para o crawler/usuário qual marketplace está vendo, sem exigir
mudar nenhuma URL BR já indexada.
