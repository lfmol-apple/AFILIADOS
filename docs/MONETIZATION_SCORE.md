# Monetization Engine

## Por que isso existe, e por que é separado do OpportunityScore

`OpportunityScore` (`lib/services/opportunity-score.ts`) responde uma pergunta, para o
**visitante**: *é uma boa compra agora?*

`MonetizationScore` (`lib/services/monetization-score.ts`) responde uma pergunta diferente, para
o **PreçoCaindo**: *vale a pena investir tráfego/conteúdo/capacidade operacional nesta
oportunidade?*

As duas nunca podem se misturar. `calculateMonetizationScore()` nunca lê um `OpportunityScore` —
nem por engano, nem "só para desempate". O `OpportunityScore` de um produto jamais deve ser
manipulado para aumentar comissão. Isso é auditável: nenhum teste de `MonetizationScore` importa
nada de `lib/services/opportunity-score.ts`, e o próprio serviço não tem esse import.

## Por que MonetizationScore é escopado por `MerchantListing`, não por `CanonicalProduct`

Comissão e demanda variam por loja — o "mesmo" produto canônico pode ser mais interessante
economicamente na Shopee do que na Amazon num dado momento. `MonetizationScore` é 1:1 com
`MerchantListing`.

## O que NÃO foi implementado nesta fase, de propósito

A métrica econômica final descrita no briefing — **comissão esperada por 1.000 exposições** (e,
com mais dados, por 1.000 cliques) — não existe ainda. Calculá-la de verdade exige histórico real
de impressão/clique/conversão que este sistema ainda não coleta. Persistir essa fórmula agora
seria exatamente "cristalizar prematuramente uma fórmula econômica" — o que o briefing proíbe
explicitamente. `MonetizationScore` hoje é a base honesta: pontua só o que há evidência real,
`null` no que não há, nunca inventa.

## Como funciona (`calculateMonetizationScore`)

Função pura, sem Prisma, sem rede, sem IA. Recebe 5 sinais opcionais (`demand`, `commission`,
`trend`, `historicalConversion`, `offerQuality`), cada um `{ value, quality } | null`.

`quality` é um de:

- `OBSERVED` — valor real, direto de uma fonte confiável (ex.: `trendRank` da Mercado Livre).
- `DERIVED_FROM_OBSERVED` — calculado a partir de um valor observado (ex.: normalização de rank).
- `HISTORICAL_INTERNAL` — vem do próprio histórico do PreçoCaindo (clique/conversão).
- `UNKNOWN` — não há sinal nenhum. `value` é sempre `null` nesse caso — nunca 0.

`score` (0-100, `null` se não houver nenhum sinal com evidência) é a média dos componentes que
têm valor real. `confidence` (0-1, nunca `null`) reflete cobertura **e** qualidade — um score de
50 baseado em 5 sinais `OBSERVED` tem confiança maior que o mesmo 50 baseado em 5 sinais
`DERIVED_FROM_OBSERVED`, mesmo com o score idêntico. Ver `tests/monetization-score.test.ts`.

## ProductMatcher — por que é estratégico

`lib/services/product-matcher.ts` decide se dois listings (potencialmente de merchants
diferentes) são o mesmo produto real. Isso é o que permitirá, no futuro: *"Mercado Livre detectou
demanda por X; encontrar X na Shopee e, depois, na Amazon."* Sinal de demanda descoberto num
marketplace passa a poder apontar para oportunidade econômica em outro.

Prioridade: GTIN/EAN → identificador de fabricante → marca+modelo → candidato textual (usando
`jaccardSimilarity`, já existente em `lib/services/similarity.ts` — sem IA). Só GTIN e
identificador de fabricante podem retornar `status: "CONFIRMED"`. Marca+modelo e candidato
textual **sempre** retornam `"CANDIDATE"` — mesmo marca+modelo normalizados podem colidir entre
produtos genuinamente diferentes (ex.: bundle vs. unidade única, variantes de armazenamento/cor).
Toda decisão — aplicada ou não — fica registrada em `ProductMatchEvidence`, com `evidence` (Json)
mostrando exatamente o que foi comparado.

## Mercado Livre — pesquisa de API oficial (2026-09-07)

Antes de implementar qualquer coisa, os endpoints abaixo foram confirmados via pesquisa direta em
`developers.mercadolibre.com` e teste empírico contra `api.mercadolibre.com`:

| Endpoint | Uso | Confirmado |
| --- | --- | --- |
| `GET /items/{id}?include_attributes=all` | Catálogo — `MercadoLivreProvider.getProduct` | Sim, path e shape (`id`, `title`, `price`, `currency_id`, `available_quantity`, `status`, `permalink`, `attributes[]`) |
| `GET /trends/{site_id}[/{category_id}]` | Demanda — `MercadoLivreTrendsDemandSource` | Sim, retorna até 50 `{keyword, url}`, atualizado semanalmente |
| `GET /highlights/{site_id}/category/{category_id}` | Demanda — `MercadoLivreBestsellerDemandSource` | Sim, retorna `{content: [{id, position, type}]}`, top 20 |

**Achado empírico importante**: mesmo endpoints historicamente documentados como públicos (ex.
`GET /sites`) hoje retornam `403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES` sem token. Todos os três
endpoints acima exigem `Authorization: Bearer {access_token}`. Não existe fluxo anônimo
(`client_credentials`) confirmado — obter um token real exige registrar uma aplicação no
DevCenter da Mercado Livre e completar o fluxo OAuth deles, um passo humano fora deste código.

`MERCADO_LIVRE_ACCESS_TOKEN` fica vazio por padrão (`lib/config/env.ts`). Enquanto vazio, todo
método de `MercadoLivreProvider` e das duas fontes de demanda falha explicitamente, sem chamar a
rede — nunca um fallback silencioso, nunca scraping.

### Confirmado contra a API real (2026-09-07) — aplicação dedicada "Preço Caindo"

Um app dedicado do PreçoCaindo foi criado no DevCenter da Mercado Livre (não o app PETMOL
pré-existente — deliberadamente isolado, ver histórico do PR) e um token real foi obtido via
OAuth 2.0 + PKCE. Dois achados corrigiram suposições da pesquisa só-documentação acima:

1. **Causa real do `403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES` mesmo com token válido**: não é a
   "certificação" formal do Developer Partner Program da Mercado Livre (processo real, lento,
   com elegibilidade por volume de usuários recorrentes ao longo de 3 meses — pesquisado e
   confirmado como programa real, mas **não é o bloqueio deste caso**). A causa real: a
   permissão **"Publicação e sincronização"** da aplicação, em "Permissões" no DevCenter, vem
   como **"Sem acesso"** por padrão. Mudar para **"Leitura"** e salvar, seguido de um **novo**
   fluxo `authorization_code` (o escopo de um token já emitido não é reavaliado — fica fixo no
   momento da emissão, então um token antigo continua falhando mesmo depois do ajuste de
   permissão), desbloqueou `/items`, `/sites` e `/trends` imediatamente.
2. **`GET /highlights/.../category/{id}` retorna `type: "PRODUCT"`, não `"ITEM"`** como a
   pesquisa de documentação original assumiu. O `id` de cada entrada é um **id de produto de
   catálogo**, resolvido via `GET /products/{id}` (`MercadoLivreProvider.getCatalogProductName`),
   **não** `GET /items/{id}` — confirmado empiricamente: o mesmo id real 404 em `/items` e
   resolve corretamente em `/products`. `MercadoLivreBestsellerDemandSource` aceita ambos os
   tipos (`"PRODUCT"` e `"ITEM"`) para nunca descartar silenciosamente um tipo não previsto.

**Execução real, ponta a ponta** (`npx tsx scripts/ml-demand-e2e-check.ts --category MLB1051
--persist`): 50 keywords reais de `/trends` e 18/18 produtos reais resolvidos de
`/highlights` + `/products` (títulos reais em português, ex. "Smartphone Samsung Galaxy A17
128GB...", "iPhone 17 de 256 GB - Lavanda..."), todos persistidos como `MerchantListing` +
`MerchantListingSignal` (`source: "mercado_livre_highlights"`). Nenhum link de afiliado da
Mercado Livre foi gerado ou é necessário para esta coleta de demanda — por design (ver
docs/AFFILIATE_LINK_REGISTRY.md).

**Não implementado nesta fase, por falta de confirmação com o mesmo rigor**: `searchProducts`
(busca de catálogo) e um endpoint de multi-lookup de itens (`getProducts` chama `/items/{id}`
individualmente ao invés de assumir um formato de lote não confirmado).

## Shopee — corrigido: API de Afiliados real (não mais NOT_CONFIGURED incondicional)

**Esta seção estava errada na primeira versão deste documento.** A pesquisa original olhou pra
Shopee Open Platform (sellers/ERPs), que de fato exige aplicação de parceiro aprovada e não tem
nada público. Mas a conta deste projeto tem acesso a um produto diferente: a **Shopee Affiliate
API** (GraphQL, App ID + Secret Key). `ShopeeProvider` agora implementa chamadas reais
(`productOfferV2` para catálogo/comissão, `generateShortLink` para gerar link de afiliado) —
ver docs/AFFILIATE_LINK_REGISTRY.md para o formato completo confirmado (endpoint, assinatura,
campos). Continua falhando explícito e sem chamar rede sem `SHOPEE_APP_ID`/`SHOPEE_SECRET_KEY`
reais configurados.

## O que ainda falta para isto virar produção

1. ~~Um humano registrar a aplicação no DevCenter da Mercado Livre e confirmar
   `MERCADO_LIVRE_ACCESS_TOKEN`.~~ **Feito em 2026-09-07** — ver seção "Confirmado contra a API
   real" acima. Nota operacional: o token expira em ~6h (`expires_in: 21600`); renovação via
   `refresh_token` ainda não automatizada (passo manual/fora do escopo desta fase).
2. Decidir explicitamente se/quando as fontes de demanda da Mercado Livre entram em
   `lib/demand/index.ts`'s `DEFAULT_SOURCES` — **deliberadamente não fiz isso nesta fase**, para
   não arriscar quebrar o pipeline existente de demanda (`DEFAULT_SOURCES` hoje assume que toda
   fonte configurada funciona; adicionar uma fonte que lança erro sem token quebraria
   `collectDemandCandidates()` para todo mundo, já que `MERCADO_LIVRE_ACCESS_TOKEN` fica vazio por
   padrão em todo ambiente hoje).
3. Job(s) que efetivamente chamem `calculateMonetizationScore()` e persistam em
   `MonetizationScore` — não criados nesta fase (o briefing pediu só o motor puro, sem
   publicação/job novo).
4. Um humano confirmar `SHOPEE_APP_ID`/`SHOPEE_SECRET_KEY` reais e validar o formato da API
   (documentado a partir de fontes de terceiros, não do Playground da própria conta — ver
   docs/AFFILIATE_LINK_REGISTRY.md) contra uma chamada real antes de confiar nela para dinheiro
   de verdade.
5. Nenhum job ainda chama `ShopeeProvider`/`MercadoLivreProvider` automaticamente para popular
   `MerchantListing`/`MerchantListingSignal` em escala — hoje isso só acontece via
   `scripts/ml-demand-e2e-check.ts` (manual) ou a fila `/admin` (manual, só Mercado Livre).
