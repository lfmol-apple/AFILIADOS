# Automação

## Como rodar

```bash
npm run jobs:run                          # roda os 13 jobs, na ordem abaixo
npm run jobs:run DISCOVER_PRODUCTS        # roda um job específico
```

`jobs/run.ts` não depende de nenhum agendador específico de hospedagem. Em produção, qualquer um
destes funciona sem alterar o código:

- **GitHub Actions com `schedule:`** (cron) chamando `npm run jobs:run <JOB>` num workflow separado
- **crontab de um VPS** chamando o mesmo comando
- **uma fila/worker** (ex.: um serviço que importa `jobs/index.ts` e chama `JOBS[name]()`)

## Os 13 jobs

| Job | O que faz | Frequência recomendada |
| --- | --- | --- |
| `DISCOVER_PRODUCTS` | Busca produtos novos no `CommerceProvider` ativo a partir de palavras-chave configuradas (`lib/config/discovery.ts`) e cria `Product`/`Offer`/`PriceHistory` para os que ainda não existem. | Diária |
| `REFRESH_PRIORITY_PRODUCTS` | Atualiza oferta/preço dos produtos `HOT`. | Mais frequente que os demais |
| `REFRESH_CATALOG` | Atualiza o restante do catálogo (`WARM`/`COLD`) em lotes, respeitando limites de API. | Menos frequente |
| `CALCULATE_PRICE_STATS` | Recalcula `PriceStats` a partir do `PriceHistory` bruto — nunca inventa cobertura maior do que a coletada. | A cada refresh de preço |
| `CALCULATE_OPPORTUNITIES` | Recalcula `OpportunityScore` e roda o `PriceDropDetector`; quedas relevantes promovem o produto para `HOT` imediatamente. | A cada refresh de preço |
| `REBALANCE_PRODUCT_PRIORITIES` | Roda o `ProductPriorityService` (`lib/services/product-priority.ts`) sobre todo o catálogo ativo, **rebaixando** produtos cujos sinais esfriaram (`HOT`→`WARM`, `WARM`→`COLD`) e capando produtos sem estoque abaixo de `HOT`. Complementa a promoção imediata que `CALCULATE_OPPORTUNITIES` já faz. | Diária — os limiares de "stale" em `lib/config/priority.ts` são medidos em dias, então rodar com mais frequência não muda o resultado. |
| `DISCOVER_CONTENT_OPPORTUNITIES` | Identifica produtos com dados suficientes mas sem página editorial e cria `SearchOpportunity`, já pontuado pelo `DemandEngine` (docs/DEMAND_ENGINE.md). | Diária |
| `GENERATE_CONTENT` | Consome as `SearchOpportunity` de maior prioridade e chama o `ContentProvider` ativo com um payload `VerifiedFacts`. No-op (não é falha) quando `CONTENT_GENERATION=off`. | Diária |
| `VALIDATE_CONTENT` | Roda o `ContentQualityGate` (incluindo checagem de duplicação contra conteúdo já publicado) sobre conteúdo `DRAFT` e decide `APPROVED` / `VALIDATING` (revisão humana) / `REJECTED`. | Diária |
| `PUBLISH_CONTENT` | Consulta o `PublicationDecisionEngine` para cada item `APPROVED` (CREATE/NOINDEX/UPDATE/KEEP/REJECT) e só grava no banco **se `AUTO_PUBLISH=true`**. Com o padrão `false`, apenas reporta o breakdown de decisões — nunca ignora o quality gate. | Diária |
| `REFRESH_SITEMAPS` | O sitemap é servido dinamicamente por `app/sitemap.ts` a cada request; este job existe como ponto de extensão para quando isso migrar para uma estratégia com cache/ISR que precise de invalidação explícita. | — |
| `MARK_STALE_CONTENT` | Marca como `STALE` conteúdo `PUBLISHED` que não é regenerado há mais de 60 dias. | Diária |
| `CLEANUP` | Remove `AutomationRun` com mais de 90 dias e `GeneratedContent` `REJECTED` com mais de 30 dias. Nunca toca em `Product`, `Offer`, `PriceHistory` ou conteúdo publicado. | Diária |

## Observabilidade e locking

Todo job roda dentro de `runJob()` (`lib/jobs/automation-run.ts`), que:

- cria uma linha em `AutomationRun` com status `RUNNING` no início;
- bloqueia uma segunda execução concorrente do mesmo job (lê se já existe uma `RUNNING`);
- **recupera um lock travado**: se a `RUNNING` mais recente já passou de 60 minutos (
  `STALE_LOCK_TIMEOUT_MINUTES`), assume que o processo que a criou morreu (crash, container
  matado), marca essa linha como `FAILED` com `metadata.staleLockRecovered: true`, e permite que
  uma nova execução comece — em vez de bloquear o job para sempre (projeto brief Parte T);
- atualiza para `SUCCESS` / `PARTIAL` (se houve erros parciais) / `FAILED` ao final, com contadores
  (`processed`, `created`, `updated`, `errors`) e metadata livre em JSON.

`runJob()` aceita um terceiro parâmetro opcional `{ marketplace }`, que grava
`AutomationRun.marketplace`. Os jobs que operam sobre o catálogo de produtos
(`DISCOVER_PRODUCTS`, `REFRESH_PRIORITY_PRODUCTS`, `REFRESH_CATALOG`, `CALCULATE_PRICE_STATS`,
`CALCULATE_OPPORTUNITIES`, `REBALANCE_PRODUCT_PRIORITIES`) já passam `{ marketplace: "BR" }`, já
que hoje só o Brasil está habilitado. Jobs de conteúdo/manutenção (validação, publicação,
cleanup, sitemap) não são marketplace-scoped e deixam o campo `null`.

O dashboard `/admin` lê `AutomationRun` para mostrar a última execução de cada job, jobs com falha
nos últimos 7 dias, e erros do dia. `tests/automation-run.test.ts` cobre o locking, a recuperação
de lock travado, e os estados `FAILED`/`PARTIAL`.

## Idempotência

Rodar qualquer job duas vezes seguidas não corrompe dados: `DISCOVER_PRODUCTS` verifica a
constraint única `(provider, asin)` antes de criar; `GENERATE_CONTENT` usa `upsert` por
`(contentType, slug)`; `DISCOVER_CONTENT_OPPORTUNITIES` só enfileira produtos sem uma oportunidade
`PENDING`/`IN_PROGRESS` já existente; `PriceHistory` só recebe um novo ponto quando o preço
realmente mudou. Não há, hoje, um teste de idempotência dedicado para cada job individualmente
(além do locking) — é uma pendência conhecida para expandir a suíte.

## Priorização (`HOT` / `WARM` / `COLD`)

`Product.updatePriority` controla a frequência de atualização, decidido por
`decideProductPriority()` (`lib/services/product-priority.ts`) a partir de sinais reais: score,
queda percentual, disponibilidade, cliques recentes, e há quanto tempo a prioridade não muda —
nunca por IA, e nunca com um número mágico fora de `lib/config/priority.ts`. Uma queda de preço
detectada por `CALCULATE_OPPORTUNITIES` promove o produto para `HOT` imediatamente;
`REBALANCE_PRODUCT_PRIORITIES` é quem rebaixa produtos cujos sinais esfriaram, respeitando uma
janela de estabilidade (evita oscilar HOT/WARM por ruído) e uma janela de "stale" mais longa antes
de demover. Um produto que fica `OUT_OF_STOCK` é rebaixado abaixo de `HOT` imediatamente, sem
esperar a janela de estabilidade (ver `tests/product-priority.test.ts`).

## Automação Operacional V1 — Mercado Livre e Shopee (2026-09-08)

Antes desta seção, a coleta de dados Mercado Livre/Shopee era 100% manual: um humano rodava
`scripts/ml-demand-e2e-check.ts`, `scripts/ml-enrich-offers.ts` e `scripts/shopee-first-cycle.ts`
à mão. Esses três scripts continuam existindo, inalterados no comportamento, para diagnóstico e
recuperação manual — mas agora reutilizam a mesma lógica de persistência que os jobs automáticos
abaixo, extraída para `lib/services/ml-demand-collector.ts`,
`lib/services/ml-enrichment-collector.ts` e `lib/services/shopee-cycle-collector.ts` (nunca duas
cópias divergentes do mesmo código real).

```bash
npm run jobs:run-ml-shopee    # roda ML_DEMAND -> ML_ENRICHMENT -> SHOPEE_REFRESH -> PRODUCT_MATCHER_SHADOW, nesta ordem
```

| Job | O que faz de real | Frequência |
| --- | --- | --- |
| `ML_DEMAND` (`jobs/ml-demand.ts`) | `GET /trends` (observabilidade) + `GET /highlights` para o grupo de categorias da vez (General Market Scanner V1 — 13 categorias reais, 3 grupos em rotação, `lib/config/ml-demand-categories.ts`), resolve o nome real via `GET /products/{id}` e persiste `MerchantListing`+`MerchantListingSignal`+`MonetizationScore`. | A cada ciclo (rotação: cobertura completa a cada 3 ciclos) |
| `SHOPEE_DEMAND_DRIVEN` (`jobs/shopee-demand-driven.ts`) | Pega os 5 termos `brand+model` de maior `MonetizationScore` real do ML, busca cada um via `productOfferV2(keyword:...)`, filtra por `lib/services/shopee-relevance-gate.ts` (determinístico, sem LLM) e só persiste resultados `RELEVANT`. Complementar a `SHOPEE_REFRESH` (geral), nunca o substitui. Ver `docs/DEMAND_DRIVEN_DISCOVERY.md`. | A cada ciclo, após `SHOPEE_REFRESH` |
| `ML_ENRICHMENT` (`jobs/ml-enrichment.ts`) | Para cada produto de catálogo que `ML_DEMAND` já persistiu, busca ofertas reais de vendedores (`GET /products/{id}/items`) e reputação real (`GET /users/{sellerId}`), persiste uma `MerchantListing` por oferta real + `MonetizationScore`. Nunca gera link de afiliado — isso seria a fila humana (`getMlAffiliateQueue`, abaixo). | A cada ciclo, logo após `ML_DEMAND` |
| `SHOPEE_REFRESH` (`jobs/shopee-refresh.ts`) | `productOfferV2` (até 15 ofertas, mesmo padrão de `scripts/shopee-first-cycle.ts`) e, quando a oferta ainda não tem um `AffiliateLinkRegistry` `ACTIVE`, gera um link real via `generateShortLink` — `sub_id1=precocaindo` preservado (`buildShopeeSubIds`, inalterado). Diferente de Mercado Livre: aqui o ciclo completo "descobrir -> pontuar -> gerar link" roda sozinho, porque a API da Shopee gera o link de verdade (nunca scraping/RPA). | A cada ciclo |
| `PRODUCT_MATCHER_SHADOW` (`jobs/product-matcher-shadow.ts`) | Roda por último, sobre o que os três acima acabaram de persistir — nunca chama rede. Gera candidatos conservadores e persiste decisões em `ProductMatchEvidence`, em shadow mode (nunca altera `MerchantListing.canonicalProductId`, nunca afeta `/ofertas`/busca/Home/Radar). Ver `docs/PRODUCT_MATCHER.md`. | A cada ciclo, por último |

Cada job roda dentro de `runJob()` — mesmo mecanismo de locking/`AutomationRun`/observabilidade
dos 13 jobs da Amazon, sem um segundo sistema. `jobs/run-ml-shopee-cycle.ts` (`ML_SHOPEE_CYCLE`)
envolve os três num lock externo, mesmo padrão de `jobs/run.ts`'s `runFullCycle()` — impede que
dois disparos de cron sobrepostos rodem ao mesmo tempo, e a falha de um step nunca derruba os
outros dois (cada `step.run()` tem seu próprio try/catch no runner do ciclo).

**Retry/backoff**: `lib/jobs/retry.ts` — até 3 tentativas com backoff exponencial (500ms, 1s, 2s)
para erros transitórios (timeout, 429, 5xx, falha de conexão); erros explícitos (401, token
inválido, config faltando, schema inesperado) nunca são retentados — falham na primeira tentativa,
visíveis no `AutomationRun` como `FAILED` com a mensagem sanitizada (nunca um segredo).

**Token Mercado Livre**: os dois jobs usam `getValidMercadoLivreAccessToken()`
(`lib/services/ml-token-store.ts`, auto-refresh via `IntegrationCredential`) em vez do
`MERCADO_LIVRE_ACCESS_TOKEN` estático — `MercadoLivreTrendsDemandSource` e
`MercadoLivreBestsellerDemandSource` agora aceitam um provedor de token injetável (terceiro
parâmetro opcional, default = env estático, comportamento manual inalterado) para isso. Sem essa
mudança, um ciclo automático pararia de funcionar silenciosamente ~6h depois do bootstrap, sem
nunca renovar — exatamente o tipo de falha que só apareceria depois de rodar sozinho por um tempo.

**Fila humana (geração de link Mercado Livre)**: continua manual, por design — não existe scraping
nem RPA. `getMlAffiliateQueue()` (`lib/queries/ml-affiliate-queue.ts`, threshold real
`DEFAULT_MIN_MONETIZATION_SCORE = 50`, já existente antes desta automação) já filtra
automaticamente quais das ofertas reais que `ML_ENRICHMENT` persiste merecem a atenção de um
humano — a automação nunca precisou adicionar uma fila própria: alimentar mais `MerchantListing`/
`MonetizationScore` reais é suficiente, a consulta existente já reordena e já filtra.

**Frequência real escolhida**: a cada 4 horas (`0 */6 * * *` seria "algumas vezes ao dia" também;
4h foi escolhido por dar folga confortável antes da janela de expiração do token de ~6h, sem ser
agressivo contra os limites reais — ainda não documentados publicamente — da Shopee Affiliate API
nem do Mercado Livre). **Isto não é uma obrigação rígida** — ajustável no crontab do VPS sem
alterar código, conforme a duração real observada dos jobs e qualquer limite de taxa que apareça.

**Painel `/admin`**: nenhuma mudança de UI foi necessária — a seção "Automação — última execução
por job" (`lib/queries/admin.ts`'s `getLatestJobRuns()`, já existente) já é derivada dos nomes de
job reais em `AutomationRun`, não de uma lista fixa — `ML_DEMAND`/`ML_ENRICHMENT`/
`SHOPEE_REFRESH`/`ML_SHOPEE_CYCLE` aparecem ali automaticamente assim que rodam pela primeira vez.

## Orçamento de coleta (`RefreshPlanner`)

`lib/services/refresh-planner.ts` decide **quais** produtos entram no lote de um refresh e em que
ordem — HOT antes de WARM antes de COLD, e dentro do mesmo nível, o mais desatualizado primeiro —
sem nunca exceder um `rateBudget` explícito. Deliberadamente não hardcoda uma frequência absoluta
de chamadas por minuto/hora, porque os limites reais da Creators API ainda não foram confirmados
(ver docs/AMAZON.md) — o orçamento é decidido por quem chama o planner, não pelo planner em si.
