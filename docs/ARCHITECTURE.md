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
lib/services/ (PriceStats, OpportunityScore, PriceDropDetector)
   │
   ▼
jobs/ (CALCULATE_PRICE_STATS, CALCULATE_OPPORTUNITIES)
   │
   ▼
ContentProvider (interface)  ───►  MockContentProvider | OpenAI/Anthropic (stub)
   │
   ▼
ContentQualityGate  ───►  GeneratedContent (DRAFT → APPROVED/REJECTED → PUBLISHED)
   │
   ▼
app/ (Next.js pages)  ───►  visitante
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
| `lib/config/` | `env.ts` (parse Zod de `process.env`), feature flags, config do site |
| `lib/providers/` | `CommerceProvider` e suas implementações (Mock, Amazon) |
| `lib/content/` | `ContentProvider` e suas implementações (Mock, OpenAI, Anthropic) |
| `lib/services/` | Lógica de domínio pura e testável (score, stats, slug, quality gate) |
| `lib/amazon/` | `AmazonPolicyGuard` — única fonte de verdade sobre regras Amazon |
| `lib/queries/` | Acesso a dados usado pelas páginas (mantém Prisma fora dos componentes) |
| `lib/jobs/` | Infraestrutura compartilhada de jobs (`AutomationRun`, refresh) |
| `jobs/` | Os 12 jobs de automação, um arquivo por job |
| `prisma/` | Schema, migrations, seed |
| `prompts/` | Prompts versionados para geração de conteúdo |
| `types/` | Tipos compartilhados entre camadas (`commerce.ts`, `content.ts`) |
| `docs/` | Esta documentação |
| `tests/` | Testes Vitest, um arquivo por serviço testado |

## Por que essa separação

- **`CommerceProvider`** existe para que o núcleo do produto (banco, score, SEO, conteúdo) nunca
  dependa da forma exata da resposta da Amazon. Adicionar um segundo marketplace é escrever um
  novo provider, não alterar `Product`, `Offer` ou as páginas.
- **`ContentProvider`** segue o mesmo padrão para geração de conteúdo — trocar de OpenAI para
  Anthropic (ou desligar geração) é uma variável de ambiente.
- **`AmazonPolicyGuard`** centraliza toda regra de compliance (host permitido, tag de afiliado,
  disclosure) para que nenhuma outra parte do código precise "lembrar" da regra — ela só pode
  chamar o guard.
- **Jobs vs. páginas**: páginas fazem leitura (read-only) de dados já calculados; toda escrita
  (descoberta, refresh de preço, cálculo de score, geração de conteúdo) acontece em jobs
  observáveis via `AutomationRun`. Isso é o que torna a operação diária "sem toque manual"
  (seção 2 do briefing do produto).

## Modelo de dados (resumo)

`Product` → `Offer[]` (snapshot de cada observação de preço/disponibilidade) → `PriceHistory[]`
(série temporal usada para o gráfico e as estatísticas) → `PriceStats` (agregação cacheada) →
`OpportunityScore` (0-100, com sub-notas). `GeneratedContent` é independente de `Product` por
`entityId` solto (não FK) porque também cobre `BEST_OF`/`COMPARISON`/`CATEGORY`, que não têm um
único produto dono. `AutomationRun` registra cada execução de job. `AffiliateClick` registra
cliques sem dado pessoal. Veja `prisma/schema.prisma` para os campos completos.
