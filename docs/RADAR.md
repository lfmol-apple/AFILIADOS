# Radar

"O que está acontecendo agora que pode fazer valer a pena comprar?" (project brief, 2026-09-07).
Detecta eventos comercialmente/relevantes-ao-consumidor a partir de dados reais já coletados —
nunca produtos parados apresentados como se fossem notícia.

## Por que sem tabela `RadarEvent` nova (por enquanto)

Auditoria antes de implementar (project brief seção 4): `Offer`/`PriceHistory`/`PriceStats` são
exclusivos de `Product` (Amazon legado) — não servem para Shopee/ML, que usam
`MerchantListing`/`MerchantListingSignal`. `MerchantListingSignal` já **acumula** snapshots reais
(cada rodada de `scripts/ml-enrich-offers.ts`/`scripts/shopee-first-cycle.ts` cria uma linha nova,
nunca sobrescreve) — confirmado com dado real: 179/181 ofertas ML e 12/12 listings Shopee já
tinham ≥2 snapshots reais no momento desta auditoria, o suficiente para detectar `PRICE_DROP` sem
inventar nada.

Com isso, todo evento é **derivado em tempo de consulta** (`lib/services/radar.ts` +
`lib/queries/radar-events.ts`) — nenhuma tabela nova. No volume real de hoje (18 catalog products
ML, ~180 ofertas, 12 listings Shopee) é um punhado de queries por request, não um problema de
performance. Revisitar essa decisão (aí sim criar persistência) quando qualquer um destes ficar
real: ruído de duplicação entre requests (o mesmo preço observado gerando eventos "piscando"),
necessidade de um ciclo de vida "visto/publicado", ou tracking de clique por evento precisando de
um id estável além da vida de um único signal.

## Eventos implementados (com suporte real hoje)

| Evento | Evidência exigida | Fonte |
| --- | --- | --- |
| `PRICE_DROP` | 2 observações reais e distintas de preço, queda ≥3% | `MerchantListingSignal.raw.price`/`priceMin`, por `observedAt` |
| `BESTSELLER_ENTRY` / `TREND_ENTRY` | rank real ≤10 | `MerchantListingSignal.bestsellerRank`/`trendRank` (ML) |
| `HIGH_QUALITY_OFFER` | `offerQualityScore` real ≥80 (ML) OU `rating` real ≥4.5 (Shopee) | `lib/services/ml-offer-quality.ts` / `MerchantListingSignal.rating` |
| `AFFILIATE_LINK_ACTIVATED` | `AffiliateLinkRegistry.status === "ACTIVE"` há ≤7 dias | fato interno — nunca exibido como qualidade ao consumidor, excluído do feed público |

## Adiados (sem suporte real suficiente ainda)

- `NEW_RECENT_LOW`/`PRICE_RECOVERY`/`LOST_ATTRACTIVENESS`: exigem janela de histórico maior (dias/
  semanas) do que o projeto tem hoje (poucas horas de coleta real) — implementar a fórmula agora
  seria simular inteligência sem dado suficiente.
- `TREND_ACCELERATION`/`RANK_IMPROVEMENT`: exigem ≥2 observações de rank em momentos distintos
  para o MESMO produto — hoje só há uma rodada de highlights persistida; a lógica de
  `detectRankEvent` já está pronta para isso quando houver histórico (reaproveitar
  `detectPriceDrop`'s padrão de comparar os dois pontos mais recentes).
- `OFFER_BECAME_MONETIZABLE`: seria essencialmente redundante com `AFFILIATE_LINK_ACTIVATED` como
  já implementado — não duplicado.

## Fato vs. valor vs. prioridade comercial (seção 6 do briefing)

`RadarEvent.headline`/`evidence` são gerados por função pura, só a partir de evidência real —
nunca leem `MonetizationScore`. `calculateRadarPriority()` soma um "empurrão comercial" **limitado
a 10 pontos** (de um peso-base de 40–100 por tipo de evento) — nunca o suficiente para uma
oportunidade fraca "furar a fila" na frente de uma factualmente mais forte (testado:
`tests/radar.test.ts`).

## Decay de recência

Linear, documentado, testável: peso 1.0 no instante do evento, decaindo a 0 em 72h
(`RADAR_DECAY_WINDOW_MS`). Sem fórmula sofisticada — exatamente o que o briefing pediu.

## Deduplicação

Por construção: cada detector roda no máximo uma vez por listing por tipo de evento (o par mais
recente de sinais, o rank mais recente, etc.) — nunca duas variações de texto para o mesmo fato.

## Home

Nova seção "🔥 O que está acontecendo agora" (`components/radar-feed.tsx`), logo após o hero,
antes do conteúdo institucional — server component, sem alterar a arquitetura de
`getHomeSections()` (Amazon, inalterada). CTA só aparece com `AffiliateLinkRegistry.status ===
"ACTIVE"` — mesma regra fail-closed do resto do projeto. Merchant aparece como rótulo pequeno
("Disponível no Mercado Livre"), nunca como protagonista (seção 11).

## Admin

Bloco "Radar hoje" dentro do Centro de Operações já existente — contagens reais (eventos
detectados, publicáveis com link ativo, monetizáveis sem link, quedas de preço reais) + lista dos
8 primeiros eventos. Reaproveita `getAdminRadarFeed()` (inclui `AFFILIATE_LINK_ACTIVATED`, que o
feed público exclui).

## Adiado nesta fase (com justificativa)

- **Cross-merchant ("onde está mais barato")**: exigiria correlacionar CanonicalProducts de
  Shopee e ML por GTIN/marca+modelo com confiança real — não auditado a fundo nesta fase; melhor
  omitir do que arriscar comparar produtos diferentes (seção 16 do briefing concorda
  explicitamente com essa escolha).
- **Job-cycle (seção 24)**: os 13 jobs existentes são Amazon-only; migrar Shopee/ML de scripts
  manuais para o ciclo de jobs automático é uma decisão operacional maior (frequência, lock,
  volume de chamadas de API) que o projeto já vinha adiando deliberadamente fase após fase — não
  forçada agora para não introduzir automação mal testada.
- **OG dinâmico com claim de queda real** e **share buttons (WhatsApp/Telegram/copiar link)**: não
  implementados nesta rodada por prioridade de tempo — o Radar (motor + Home + admin) e o refresh
  automático de token (risco operacional citado explicitamente como prioritário) vieram primeiro.
  `/produto/[slug]/opengraph-image` já existe (herdado de fases anteriores); não foi auditado a
  fundo se já usa dado real de queda ou é genérico — próxima fase deveria confirmar isso antes de
  qualquer mudança.
- **SEO on-page do `/produto/[slug]`** (JSON-LD, `AggregateOffer`, etc.) para dados Shopee/ML: não
  auditado nesta fase — hoje `/produto/[slug]` é uma rota exclusiva do catálogo Amazon
  (`Product`/`CanonicalProduct` legado); Shopee/ML ainda não têm página de produto própria, só
  aparecem em cards (showcase, radar, fila admin). Criar essa página é trabalho real de fase
  futura, não uma mudança pequena.
