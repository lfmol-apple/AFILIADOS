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

## O que ainda não existe

Não há integração real com Mercado Livre, Shopee, AWIN ou outro parceiro. Não
há scraping. Um provider só deve virar `live` quando houver API/contrato real,
host validado e testes de redirect.
