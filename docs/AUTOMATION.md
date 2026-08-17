# Automação

## Como rodar

```bash
npm run jobs:run                          # roda os 12 jobs, na ordem abaixo
npm run jobs:run DISCOVER_PRODUCTS        # roda um job específico
```

`jobs/run.ts` não depende de nenhum agendador específico de hospedagem. Em produção, qualquer um
destes funciona sem alterar o código:

- **GitHub Actions com `schedule:`** (cron) chamando `npm run jobs:run <JOB>` num workflow separado
- **crontab de um VPS** chamando o mesmo comando
- **uma fila/worker** (ex.: um serviço que importa `jobs/index.ts` e chama `JOBS[name]()`)

## Os 12 jobs

| Job | O que faz |
| --- | --- |
| `DISCOVER_PRODUCTS` | Busca produtos novos no `CommerceProvider` ativo a partir de palavras-chave configuradas (`lib/config/discovery.ts`) e cria `Product`/`Offer`/`PriceHistory` para os que ainda não existem. |
| `REFRESH_PRIORITY_PRODUCTS` | Atualiza oferta/preço dos produtos `HOT` (maior tráfego/oportunidade). Deve rodar com mais frequência. |
| `REFRESH_CATALOG` | Atualiza o restante do catálogo (`WARM`/`COLD`) em lotes, respeitando limites de API. |
| `CALCULATE_PRICE_STATS` | Recalcula `PriceStats` (mínimo, máximo, médias, distância do menor preço) a partir do `PriceHistory` bruto — nunca inventa cobertura maior do que a coletada. |
| `CALCULATE_OPPORTUNITIES` | Recalcula `OpportunityScore` e roda o `PriceDropDetector`; quedas relevantes promovem o produto para prioridade `HOT`. |
| `DISCOVER_CONTENT_OPPORTUNITIES` | Identifica produtos com dados suficientes mas sem página editorial e cria `SearchOpportunity`. |
| `GENERATE_CONTENT` | Consome as `SearchOpportunity` de maior prioridade e chama o `ContentProvider` ativo. No-op (não é falha) quando `CONTENT_GENERATION=off`. |
| `VALIDATE_CONTENT` | Roda o `ContentQualityGate` sobre conteúdo `DRAFT` e decide `APPROVED` / `VALIDATING` (revisão humana) / `REJECTED`. |
| `PUBLISH_CONTENT` | Publica conteúdo `APPROVED` **somente se `AUTO_PUBLISH=true`**. Com o padrão `false`, apenas conta quantos itens estão elegíveis — nunca ignora o quality gate. |
| `REFRESH_SITEMAPS` | O sitemap é servido dinamicamente por `app/sitemap.ts` a cada request; este job existe como ponto de extensão para quando isso migrar para uma estratégia com cache/ISR que precise de invalidação explícita. |
| `MARK_STALE_CONTENT` | Marca como `STALE` conteúdo `PUBLISHED` que não é regenerado há mais de 60 dias. |
| `CLEANUP` | Remove `AutomationRun` com mais de 90 dias e `GeneratedContent` `REJECTED` com mais de 30 dias. Nunca toca em `Product`, `Offer`, `PriceHistory` ou conteúdo publicado. |

## Observabilidade

Todo job roda dentro de `runJob()` (`lib/jobs/automation-run.ts`), que:

- cria uma linha em `AutomationRun` com status `RUNNING` no início;
- bloqueia uma segunda execução concorrente do mesmo job (lê se já existe uma `RUNNING`);
- atualiza para `SUCCESS` / `PARTIAL` (se houve erros parciais) / `FAILED` ao final, com contadores
  (`processed`, `created`, `updated`, `errors`) e metadata livre em JSON.

O dashboard `/admin` lê `AutomationRun` para mostrar jobs com falha nos últimos 7 dias e erros do
dia.

## Priorização (`HOT` / `WARM` / `COLD`)

`Product.updatePriority` controla a frequência de atualização. Novos produtos entram como
`COLD`/`WARM` (definido no seed/discovery); uma queda de preço detectada por
`CALCULATE_OPPORTUNITIES` promove o produto para `HOT` automaticamente. Não há, hoje, uma rotina
que rebaixe um produto `HOT` de volta — esse é um próximo passo natural (ex.: rebaixar após N dias
sem cliques), documentado como pendência.
