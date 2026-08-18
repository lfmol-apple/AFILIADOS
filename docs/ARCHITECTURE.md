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
| `lib/observability/` | Health checks e métricas internas |
| `lib/seo/` | Structured data, indexabilidade, redirects de slug |
| `lib/http/` | `RetryPolicy` genérica para chamadas externas futuras |
| `lib/config/marketplaces.ts` | `AmazonMarketplaceConfig` por marketplace (BR/US) — host, moeda, tag, enabled/apiEnabled |
| `lib/amazon/` | `AmazonPolicyGuard` (marketplace-aware) — única fonte de verdade sobre regras Amazon; `readiness-checks.ts`/`status.ts` para admin e production:readiness |
| `lib/queries/` | Acesso a dados usado pelas páginas (mantém Prisma fora dos componentes) |
| `lib/jobs/` | Infraestrutura compartilhada de jobs (`AutomationRun` com locking/stale recovery) |
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
redirects permanentes. Veja `prisma/schema.prisma` para os campos completos.
