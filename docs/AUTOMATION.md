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

## Orçamento de coleta (`RefreshPlanner`)

`lib/services/refresh-planner.ts` decide **quais** produtos entram no lote de um refresh e em que
ordem — HOT antes de WARM antes de COLD, e dentro do mesmo nível, o mais desatualizado primeiro —
sem nunca exceder um `rateBudget` explícito. Deliberadamente não hardcoda uma frequência absoluta
de chamadas por minuto/hora, porque os limites reais da Creators API ainda não foram confirmados
(ver docs/AMAZON.md) — o orçamento é decidido por quem chama o planner, não pelo planner em si.
