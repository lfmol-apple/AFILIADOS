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

## Fase 2 — enriquecimento comercial do Mercado Livre (2026-09-07)

### Matriz de capacidades (investigação real, app "Preço Caindo")

Toda linha abaixo foi confirmada com uma chamada real e autenticada contra `api.mercadolibre.com`
— nada foi assumido a partir de documentação sem testar.

| Sinal | Disponível? | Endpoint/Fonte | Qualidade | Persistência | Ação |
| --- | --- | --- | --- | --- | --- |
| Título do catalog product | SIM | `GET /products/{id}` `.name` | OBSERVED | `CanonicalProduct.title` | reutilizado |
| Imagem do catalog product | SIM | `GET /products/{id}` `.pictures[]` | OBSERVED | `CanonicalProduct.imageUrl` | novo |
| Marca/Modelo/Linha | SIM | `.attributes[BRAND\|MODEL\|LINE]` | OBSERVED | `CanonicalProduct.brand/model/specifications` | novo |
| GTIN/EAN | PARCIAL — nem todo produto tem | `.attributes[GTIN]` | OBSERVED quando presente | `CanonicalProduct.gtin` | novo, `null` quando ausente |
| domain_id/categoria | SIM | `.domain_id` | OBSERVED | `CanonicalProduct.specifications` | novo |
| **Ofertas/itens do catalog product** | **SIM** | `GET /products/{id}/items` — associação nativa da própria API, não inferida | OBSERVED | 1 `MerchantListing` por oferta real | novo |
| Preço da oferta | SIM | `.results[].price` | OBSERVED | `MerchantListingSignal.raw` | novo |
| Preço anterior/desconto real | PARCIAL — só quando existe | `.results[].original_price` | OBSERVED quando presente | `MerchantListingSignal.raw` | novo |
| Condição (novo/usado) | SIM | `.results[].condition` | OBSERVED | `MerchantListingSignal.raw` | novo |
| Frete grátis | SIM | `.results[].shipping.free_shipping` | OBSERVED | `MerchantListingSignal.raw` | novo |
| Vendedor (id) | SIM | `.results[].seller_id` | OBSERVED | `MerchantListingSignal.raw` | novo |
| Reputação do vendedor | SIM | `GET /users/{sellerId}` `.seller_reputation` | OBSERVED | `MerchantListingSignal.raw.seller` | novo |
| **Sold quantity por oferta** | **NÃO** — `GET /items/{id}` retorna 403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` para itens de outros vendedores com as permissões atuais do app; não vem em `/products/{id}/items` | — | UNKNOWN | — | nunca inventado |
| **Rating/reviews da oferta** | **NÃO** — `GET /reviews/item/{id}` retorna o mesmo 403 | — | UNKNOWN | — | nunca inventado |
| **Comissão de afiliado** | **NÃO** — nenhum endpoint de afiliados no escopo desta aplicação; a única via oficial continua o portal manual (`afiliados.mercadolivre.com.br`) | — | UNKNOWN | — | nunca estimado a partir de taxas do vendedor (que são uma coisa diferente) |

Achado estrutural: `GET /items/{id}` (usado por `MercadoLivreProvider.getProduct`) funciona para
qualquer id, mas retorna 403 para itens de **outros vendedores** — não é necessário para o
enriquecimento, porque `GET /products/{id}/items` já traz preço/condição/frete/vendedor inline.

### Modelagem — por que sem migration e sem nova entidade

Cada oferta real vira um `MerchantListing` de verdade (não uma "oferta fictícia" — é o modelo
semântico correto para "isto é o que um vendedor real está cobrando"). A ligação
catalog-product → CanonicalProduct → ofertas usa `MerchantListing.canonicalProductId` diretamente,
**sem** passar por `ProductMatchEvidence`: esse mecanismo existe para correlacionar duas ofertas de
**merchants diferentes** com evidência heurística (GTIN/marca+modelo/textual) que precisa ser
auditável porque pode estar errada. Aqui a relação catalog-product↔oferta é **afirmada pela própria
API da Mercado Livre** (`GET /products/{id}/items`), não inferida — não há "candidato" a registrar.
`ProductMatcher`/`ProductMatchEvidence` continuam intactos e prontos para o próximo passo real desta
arquitetura: cruzar esse `CanonicalProduct` (agora com marca/modelo/GTIN reais) contra ofertas da
Shopee.

`CanonicalProduct.specifications.catalogProductId` guarda o id do catalog product que originou cada
grupo — é assim que `getMlAffiliateQueue`/`getTodaysOpportunities` distinguem "a linha de demanda
abstrata" de "uma oferta real" sem precisar de uma migration nova (`ExternalIdType` não ganhou um
valor `CATALOG_PRODUCT_ID`; não havia necessidade real).

### Fila inteligente — o que mudou

`getMlAffiliateQueue` (evoluída, não recriada) agora, para cada produto com demanda aprovada, busca
a melhor oferta real entre as persistidas por `scripts/ml-enrich-offers.ts` (maior
`MonetizationScore`) e troca os campos exibidos (preço, desconto, condição, frete, vendedor,
reputação, URL) pelos dela — mas o `merchantListingId` continua sendo o da linha de demanda, então
salvar um link continua funcionando exatamente como antes. Sem oferta enriquecida ainda, cai de
volta no comportamento anterior (só demanda), nunca quebra.

**Bug real encontrado e corrigido durante esta fase**: a primeira versão deixava cada oferta real
concorrer como sua própria linha de fila — com 179 ofertas reais persistidas para 18 produtos, a
fila (e a lista unificada `/admin`) ficou inundada de ofertas individuais e nenhum produto-catálogo
apareceu. Corrigido excluindo explicitamente (`signals: { none: { source:
"mercado_livre_catalog_items" } }`) linhas de oferta da consulta de candidatos — elas só aparecem
como o `bestOffer` embutido do produto, nunca como sua própria oportunidade.

### `MonetizationScore` da oferta

`demandSignal` = o score de demanda já calculado da linha de catálogo (herdado, `DERIVED_FROM_OBSERVED`
— é demanda do produto, não desta oferta específica). `offerQualitySignal` = `offerQualityScore()`
(`lib/services/ml-offer-quality.ts`), função pura e documentada: condição nova (+20), frete grátis
(+15), desconto real (até +15), reputação do vendedor (−10 a +15, `null`/nível não reconhecido = 0,
nunca penalizado por falta de dado). `commissionSignal`/`trendSignal`/`historicalConversionSignal`
ficam `null` (UNKNOWN) — nenhum dado real existe para eles ainda.

### `providerMode` (health) — investigado, não é o que parecia

`providerMode`/`contentGenerationMode` no `/api/health` refletem **exclusivamente**
`AMAZON_PROVIDER`/`CONTENT_GENERATION` (`lib/providers/index.ts`) — controlam só se
`AmazonProvider` (real) ou `MockAmazonProvider` (fake) é instanciado para a Amazon, e só a geração
de conteúdo por IA. **Não têm nenhuma relação com Shopee ou Mercado Livre** — essas duas integrações
não têm modo mock: cada método falha explicitamente sem token/credencial real, nunca substitui por
dado fake (ver `ShopeeProvider`/`MercadoLivreProvider`). `MerchantListing`/`MerchantListingSignal`
(onde Shopee/ML escrevem) são tabelas completamente separadas de `Product`/`Offer` (onde
Amazon/mock escreve) — não há como misturar dado mock com dado real entre eles. Mudar
`AMAZON_PROVIDER` para `live` é uma decisão separada, gated por `docs/AMAZON_COMPLIANCE.md`, fora do
escopo desta fase — **não alterado**.

### Automação — risco operacional real, não implementado nesta fase

Os 13 jobs em `jobs/index.ts` são todos Amazon-only; nenhum lock/cron novo foi criado para Shopee/ML
nesta fase (o briefing pediu explicitamente para não duplicar cron).

**Atualização (2026-09-07, Prompt 3) — refresh automático resolvido.** O risco descrito abaixo
(token ML expira em ~6h, sem refresh automático) foi corrigido de verdade: `lib/services/ml-token-store.ts`
agora renova o token sozinho, sob demanda, sem cron novo. Por que não dava para só mexer no
`.env`: `lib/config/env.ts` lê `process.env` uma única vez, na primeira importação — nada no
processo já em execução volta a reler o arquivo depois, então gravar um token novo no `.env`
nunca chegaria ao app rodando. A correção usa a mesma infraestrutura que já existe (o Postgres
deste projeto): uma tabela nova e pequena, `IntegrationCredential` (uma linha por provider,
migration puramente aditiva), guarda `accessToken`/`refreshToken`/`expiresAt` reais.
`getValidMercadoLivreAccessToken()` lê essa linha, renova via `grant_type=refresh_token` quando
faltam menos de 10 minutos para expirar, e devolve um token sempre válido — chamado sob demanda
por quem precisa (hoje: `scripts/ml-enrich-offers.ts` e `scripts/ml-demand-e2e-check.ts`, via
`createMercadoLivreProvider()`), nunca por um timer novo. Concorrência: uma Promise em memória
deduplica chamadas simultâneas no mesmo processo; no banco, o `UPDATE` só aplica se o
`accessToken` ainda for o que este processo leu — se outro processo já renovou primeiro (o
`refresh_token` da Mercado Livre é rotativo, de uso único), este processo simplesmente relê a
linha vencedora em vez de gastar o `refresh_token` já invalidado. Nunca loga
`accessToken`/`refreshToken`/`client_secret` (6 testes cobrindo bootstrap, cache, renovação,
concorrência e falha — `tests/ml-token-store.test.ts`). `scripts/ml-refresh-token.ts` (manual)
continua existindo como ferramenta de recuperação/bootstrap inicial, mas deixa de ser necessário
para operação rotineira. `MercadoLivreProvider` ganhou um parâmetro opcional no construtor
(`overrideAccessToken`) — puramente aditivo, `new MercadoLivreProvider()` sem argumento continua
funcionando exatamente como antes para todo código/teste existente.

*(Texto original abaixo, mantido para contexto histórico do que foi corrigido.)*

Risco real encontrado: **não existia refresh automático de `MERCADO_LIVRE_ACCESS_TOKEN`** em lugar
nenhum do código — o token expira em ~6h após emissão. Solução mínima proposta e implementada
naquele momento: `scripts/ml-refresh-token.ts`, utilitário manual (nunca chamado por cron) que
troca `MERCADO_LIVRE_REFRESH_TOKEN` por um par access/refresh novo via `POST /oauth/token` e grava
no `.env` local sem nunca imprimir os valores. Continuava exigindo que um humano rodasse o script
periodicamente — automatizar isso com segurança (rotação atômica, sem downtime, sem vazar o
refresh_token em log de
cron) fica para uma fase futura, quando fizer sentido decidir isso junto com os outros 13 jobs.

### Fluxo OAuth real implementado (2026-09-08)

`lib/services/ml-oauth.ts` implementa o Authorization Code + PKCE S256 real: `GET
/api/admin/mercadolivre/authorize` (só para admin autenticado) gera par PKCE + `state` real, grava
em cookie `HttpOnly` de 10 minutos, e redireciona para `auth.mercadolivre.com.br`. `GET
/api/auth/mercadolivre/callback` (path exigido — precisa estar cadastrado exatamente assim no
DevCenter do app "Preço Caindo", Client ID `7130181975666501`) valida `state`, troca o `code` pelo
par de tokens reais em `POST /oauth/token`, e grava na **mesma** tabela
`IntegrationCredential` que `ml-token-store.ts` já lê — nenhuma persistência nova, nenhuma
duplicação. Nunca renderiza token nenhum; erros redirecionam para `/admin?ml_oauth=error&reason=...`
com um motivo sanitizado, nunca o payload da Mercado Livre. `/admin` → Integrações → "Mercado
Livre — autenticação" mostra status real (conectado/não conectado, validade do token) e o
botão de conectar/reconectar.

### Correção urgente — `productUrl` das ofertas não é um permalink verificado (2026-09-07)

Detectado em produção: o `productUrl` gerado por `scripts/ml-enrich-offers.ts`
(`https://produto.mercadolivre.com.br/${item_id}`) nunca foi confirmado como link público
navegável — era montado manualmente, sem checar a API.

**Investigação exaustiva feita antes de corrigir** (todas chamadas reais, autenticadas):

| Tentativa | Resultado |
| --- | --- |
| `GET /items/{id}` (autenticado, item de terceiro) | 403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` |
| `GET /items/{id}` (sem autenticação) | 403, mesmo código |
| `GET /items/{id}?attributes=id,permalink` | 403 `access_denied` (subsistema diferente, ainda bloqueado) |
| `GET /items?ids=...` (multiget) | 200, mas cada item individual retorna 403 dentro do array |
| `GET /sites/MLB/search?q=...` | 403 forbidden |
| `GET /products/{id}` `.permalink` | sempre `""` (vazio) — confirmado em 5 produtos reais diferentes |
| `GET /products/{id}` `.buy_box_winner` | sempre `null` — confirmado nos mesmos 5 produtos |
| `GET /products/{id}` `.pickers[].permalink` | sempre `""` |
| `GET /reviews/item/{id}?catalog_product_id=...` (formato sugerido pela doc) | 403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` — mesmo bloqueio |

**Conclusão real**: nenhum endpoint acessível com as permissões atuais deste app confirma um
permalink público para um item de terceiro. Não é um bug de código a corrigir tentando mais
endpoints — é uma limitação real de permissão/plataforma, documentada explicitamente em vez de
contornada com scraping ou slug inventado.

**Correção aplicada** (honesta, não cosmética):

1. `productUrl` continua sendo construído a partir do `item_id` real (não é mais um "permalink
   confirmado" — é a melhor referência disponível: domínio oficial da Mercado Livre, id real, nunca
   um slug inventado ou busca genérica).
2. Cada oferta agora carrega `permalinkVerified: false` em `MerchantListingSignal.raw` — nada a
   jusante (fila, `/admin`, testes) pode tratar esse endereço como link confirmado enquanto isso for
   `false`.
3. `getMlAffiliateQueue` e o componente `MlAffiliateQueueItem` mudaram de "clique aqui, é a oferta
   real" para: aviso explícito de que o link não é confirmado + botão "Copiar termo de busca"
   (título + vendedor) para colar no portal oficial de afiliados (`afiliados.mercadolivre.com.br`) —
   o único fluxo comprovadamente funcional hoje, inalterado desde a Fase 1.
4. **Bug real de persistência corrigido**: o `upsert` só atualizava `canonicalProductId` em
   registros existentes, nunca `productUrl` — uma reexecução nunca corrigia dados antigos. Agora o
   `update` também reescreve `productUrl` a cada rerun.

**Validação real feita** (não apenas nos testes):
- Corrompi deliberadamente o `productUrl` de uma oferta real persistida e reexecutei
  `scripts/ml-enrich-offers.ts` — confirmado: o valor foi corrigido de volta ao padrão real
  baseado em `item_id`.
- 5 ofertas reais de 5 produtos diferentes (`MLB7590566500`, `MLB7246441750`, `MLB4975328747`,
  `MLB6635306902`, `MLB4828837193`) tiveram `item_id`/`seller_id` conferidos contra uma chamada
  ao vivo de `GET /products/{id}/items` no momento da validação — 5/5 correspondem exatamente,
  sem contaminação cruzada entre produtos.
- Navegabilidade via `curl` **não pôde ser confirmada** — `produto.mercadolivre.com.br` bloqueia
  requisições sem User-Agent de navegador (403) e, mesmo com um UA real, redireciona para um
  gate anti-bot (`/gz/account-verification`) antes de qualquer página de produto — inconclusivo
  por definição, e por isso não usado como prova (seria efetivamente scraping para validar, o que
  o briefing pediu para evitar).

### Extra — reviews com `catalog_product_id` (só investigação, sem mudar scoring)

Testado `GET /reviews/item/{itemId}?catalog_product_id={catalogId}` (formato sugerido pela
documentação atual da Mercado Livre) — retorna o mesmo `403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES`
de antes. `GET /reviews/catalog_product/{id}` (variação alternativa testada por hipótese) retorna
`404 resource not found`. Rating/reviews continuam `UNKNOWN` — nenhuma mudança em
`offerQualityScore`.
