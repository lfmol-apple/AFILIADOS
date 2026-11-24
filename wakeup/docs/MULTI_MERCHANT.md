# Multi-merchant

PreçoCaindo V1 continua preservando `Product`, `Offer`, `PriceHistory`,
`PriceStats`, `PriceAlert`, `AffiliateClick` e `/go/amazon/[asin]`.

A evolução multiloja foi feita no padrão **expand → migrate/backfill → validate
→ later contract**. Nesta sprint só existe a etapa expand, sem apagar nem
renomear dados existentes.

## Novas entidades

- `CanonicalProduct`: representa o produto real, independente de loja.
- `Merchant`: representa a loja ou rede parceira.
- `MerchantListing`: representa o produto dentro de uma loja.

`Product` ganhou `canonicalProductId` opcional e continua sendo o registro
legado/operacional da Amazon. `AffiliateClick` ganhou campos opcionais para
`canonicalProductId`, `merchantId` e `merchantListingId`, mantendo `productId`
obrigatório para compatibilidade.

## Roteamento

- `/go/amazon/[asin]`: preservado para links existentes.
- `/go/amazon/[marketplace]/[asin]`: preservado para Amazon multi-marketplace.
- `/go/[merchant]/[externalId]`: rota genérica preparada.

Hosts permitidos ficam centralizados em `lib/merchants/config.ts`. Merchants
futuros (`mercado-livre`, `shopee`, `awin`, `generic-affiliate`) existem como
configuração preparada, mas falham fechados até haver integração legítima.

## Backfill

Depois da migration, rode:

```bash
npm run merchant:backfill-amazon
```

O script cria o merchant Amazon, produtos canônicos e listings Amazon a partir
dos `Product` existentes. Ele é idempotente e não apaga dados.

## Monetization Engine (2026-09-07)

Ver docs/MONETIZATION_SCORE.md e docs/PRODUCT_MATCHING.md. Resumo: `MonetizationScore` (interno,
nunca o `OpportunityScore` do consumidor) e `ProductMatcher` (decide se dois `MerchantListing` são
o mesmo produto real) foram implementados como serviços puros, com `ProductMatchEvidence` e
`MerchantListingSignal` como novas tabelas aditivas. `MercadoLivreProvider` chama endpoints reais
e confirmados (`/items`, `/trends`, `/highlights`), mas exige `MERCADO_LIVRE_ACCESS_TOKEN` — sem
ele, falha explicitamente, sem chamar a rede.

**Atualização (mesmo dia)**: `ShopeeProvider` foi corrigido para a API certa (Shopee Affiliate
API, GraphQL — a pesquisa original tinha investigado a API de sellers por engano) e agora chama
endpoints reais (`productOfferV2`, `generateShortLink`) atrás de `SHOPEE_APP_ID`/
`SHOPEE_SECRET_KEY`. Também foi adicionado `AffiliateLinkRegistry` (1:1 com `MerchantListing`,
guarda o link comercial real e sua origem/atribuição) e uma fila operacional em `/admin` —
"Mercado Livre — links pendentes" — para o fluxo humano-assistido de gerar o link ML (a Shopee
gera o link via API automaticamente; o Mercado Livre continua exigindo um humano colar o link
gerado no painel oficial deles, etiquetado "precocaindo"). Ver docs/AFFILIATE_LINK_REGISTRY.md.

## O que ainda não existe

Nenhuma integração *ativa* com Mercado Livre, Shopee, AWIN ou outro parceiro — nenhuma delas está
habilitada por padrão, e nenhum job/rota pública usa esses providers ainda. Não há scraping. Um
provider só deve virar `live` de verdade quando houver credencial confirmada, host validado e
testes de redirect. As fontes de demanda da Mercado Livre não estão em
`lib/demand/index.ts`'s `DEFAULT_SOURCES` — isso é uma decisão explícita a ser tomada depois,
não uma omissão.
