# General Market Scanner V1 + Demand-Driven Discovery V1 (2026-09-08)

## O que muda

Antes desta fase, `ML_DEMAND` observava **uma única categoria real** (`MLB1051`, Celulares e
Telefones) e `SHOPEE_REFRESH` trazia uma lista de topo indiferenciada, sem relação com o que o ML
detecta. O diagnóstico anterior (docs/DEMAND_DRIVEN_DISCOVERY diagnostic round) provou: catálogos
praticamente disjuntos, keyword search da Shopee funcional mas dominado por acessórios.

Esta fase adiciona duas esteiras novas, sem substituir nada que já funcionava:

1. **General Market Scanner (Mercado Livre)** — `ML_DEMAND` agora escaneia 13 categorias reais
   (`lib/config/ml-demand-categories.ts`), em rotação de 3 grupos (4-5 categorias por grupo),
   um grupo por ciclo — cobertura completa a cada 3 ciclos (hoje: a cada 12h, cadência de 4h).
2. **Demand-Driven Discovery (Shopee)** — novo job `SHOPEE_DEMAND_DRIVEN`, complementar ao
   `SHOPEE_REFRESH` já existente (preservado, inalterado): pega os termos `brand+model` dos 5
   produtos ML de maior `MonetizationScore` real, busca cada um via `productOfferV2(keyword:...)`
   (mesmo mecanismo já confirmado real no diagnóstico anterior), filtra por uma guarda de
   relevância determinística (`lib/services/shopee-relevance-gate.ts`, sem LLM) e só persiste
   resultados `RELEVANT`.

## Categorias reais (`GET /sites/MLB/categories`, verificado ao vivo)

13 categorias, 3 grupos de rotação — ver `lib/config/ml-demand-categories.ts` para a lista
completa com IDs reais. Cada uma testada individualmente contra `GET /highlights/MLB/category/{id}`
antes de entrar na config (todas HTTP 200, todas com highlights reais). Achado durante o teste:
a categoria Beleza retorna `type: "USER_PRODUCT"` além de `"PRODUCT"` — tipo novo, nunca visto
antes — `MercadoLivreBestsellerDemandSource` agora tenta resolver esse tipo também (mesma regra
de "nunca descartar silenciosamente um tipo não visto sem tentar resolver").

## Relevance Gate — por que existe

Achado real do diagnóstico anterior: buscar "Galaxy A17" na Shopee retorna majoritariamente
capas/películas, não o aparelho. `classifyRelevance(term, resultTitle)`:

- **IRRELEVANT**: título contém sinal de acessório/peça (capa, capinha, película, puxador, cabo
  para, etc.) e o termo buscado não é ele mesmo um acessório.
- **RELEVANT**: ≥75% das palavras significativas do termo aparecem no título.
- **UNCERTAIN**: nem um nem outro — **nunca persistido**, só contado (precisão > cobertura, mesmo
  princípio do ProductMatcher).

## Identidade ML extraída sem chamada nova

`ml-enrichment-collector.ts` agora também extrai `MANUFACTURER` (77% cobertura real) e
`ALPHANUMERIC_MODELS`/`ALPHANUMERIC_MODEL` (80% cobertura real, ex. `SM-A175FZAILTM` — código real
Samsung) — campos que já vinham na resposta de `GET /products/{id}`, nunca lidos antes. Guardados
em `CanonicalProduct.specifications` (Json já existente, sem migration). Reforçam identidade
intra-ML; **não** viram GTIN, **não** confirmam Shopee↔ML sozinhos (Shopee não expõe nada
equivalente).

## Discovery source — sem migration

Cada listing/sinal agora sabe sua origem, dentro do `raw` (Json) já existente:
`MerchantListingSignal.raw.discoverySource` = `"ML_GENERAL"` (highlights), `"ML_ENRICHMENT"`
(ofertas reais), `"shopee_refresh"` ou `"shopee_demand_driven"` (Shopee — reaproveita o mesmo
`source` já usado nos `sub_ids` do link de afiliado, agora também gravado no sinal).

## Orçamento de chamadas (`lib/config/discovery-budget.ts`)

- `ML_CATEGORIES_PER_CYCLE = 4` (documentação do tamanho real dos grupos de rotação).
- `SHOPEE_DEMAND_TERMS_PER_CYCLE = 5`.
- `SHOPEE_DEMAND_RESULTS_PER_TERM = 5`.

Nenhum "escanear tudo de uma vez" — rotação determinística baseada em `AutomationRun.count()`
(reaproveitado como estado, sem tabela nova).

## Price Drop — reutilizado sem alteração

`lib/services/radar.ts`'s `detectPriceDrop` (limiar 3%, 2 observações reais) já é genérico —
não depende de categoria, já roda sobre qualquer `MerchantListing` com histórico real de preço em
`MerchantListingSignal`. Mais categorias = mais listings = mais chance de detectar quedas reais,
sem nenhuma mudança de código.

## Ordem do ciclo (cron reaproveitado, sem scheduler novo)

```
ML_DEMAND (rotação) -> ML_ENRICHMENT -> SHOPEE_REFRESH (geral) -> SHOPEE_DEMAND_DRIVEN -> PRODUCT_MATCHER_SHADOW
```
