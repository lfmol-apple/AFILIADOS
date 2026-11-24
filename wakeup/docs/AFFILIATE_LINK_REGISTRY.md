# Affiliate Link Registry

## O que é, e por que é separado de `MerchantListing`

`AffiliateLinkRegistry` (`prisma/schema.prisma`) é o único lugar que sabe "temos um link
comercial de verdade pra este listing, e de onde ele veio". Separado de `MerchantListing`
(que só sabe "este listing existe, é isso") pelo mesmo motivo que `MonetizationScore` e
`MerchantListingSignal` já são tabelas próprias: uma tabela, uma responsabilidade.

Nunca guarda segredo — `attributionTag`/`attributionProject` são só rótulos, não credenciais.

## Persistência — `lib/services/affiliate-link-registry.ts`

- `getAffiliateLink(merchantListingId)` — leitura.
- `saveManualAffiliateLink(...)` — fluxo Mercado Livre. `attributionTag` é sempre
  `"precocaindo"`, `source` é sempre `MANUAL_ADMIN`. Valida o host da URL colada via
  `assertAllowedMerchantDestination` antes de gravar — um paste errado (ex.: link de outro
  marketplace) é rejeitado, nunca persistido.
- `saveApiGeneratedAffiliateLink(...)` — fluxo Shopee. `source` é sempre `API`.

## Mercado Livre — fluxo humano-assistido

Não automatizamos a geração do link de afiliado ML nesta fase (decisão explícita do
briefing). O fluxo real:

1. `MercadoLivreProvider`/fontes de demanda encontram uma oportunidade.
2. `MonetizationScore` aprova (score ≥ 50, o corte padrão — `lib/queries/ml-affiliate-queue.ts`).
3. Se não existe `AffiliateLinkRegistry` `ACTIVE` pra aquele listing, ele aparece em
   `/admin` → "Mercado Livre — links pendentes".
4. Humano copia a URL pública, abre `afiliados.mercadolivre.com.br` → Ferramentas → Gerador
   de link, cola a URL do produto, gera o link (etiqueta **precocaindo**).
5. Humano cola o link gerado de volta no admin. `POST /api/admin/ml-affiliate-links` valida
   e grava (`source=MANUAL_ADMIN`, `status=ACTIVE`).
6. Item some da fila imediatamente. Próximas execuções acham o link salvo e não pedem de
   novo enquanto `status=ACTIVE`.

Formato confirmado do link gerado pelo ML (pesquisa direta, 2026-09-07): `mercadolivre.com/sec/...`
ou `mercadolivre.com.br/social/...` — diferente dos hosts de página de produto já cadastrados
(`mercadolivre.com.br`). `lib/merchants/config.ts` foi atualizado pra aceitar os dois formatos.

## Shopee — API de Afiliados real (correção de rumo, 2026-09-07)

A pesquisa anterior (na Fase 2/PR #4) investigou a **API errada** — Shopee Open Platform
(sellers/ERPs), que exige aplicação de parceiro aprovada. A conta deste projeto tem acesso à
**Shopee Affiliate API**, um produto diferente, GraphQL, com App ID + Secret Key (achados em
Shopee Affiliate → "Open API").

**Fonte**: documentação técnica de terceiros sobre a API oficial (não foi possível navegar
diretamente nos docs da própria conta nesta sessão) — verificar contra o Playground da conta
antes de confiar nisso para dinheiro real.

| Campo | Valor |
| --- | --- |
| Endpoint | `https://open-api.affiliate.shopee.com.br/graphql` |
| Autenticação | `Authorization: SHA256 Credential={AppId}, Timestamp={Timestamp}, Signature={Signature}` |
| Assinatura | `SHA256(AppId + Timestamp + Payload + SecretKey)`, hex, `Payload` = corpo JSON exato enviado |
| Gerar link | mutation `generateShortLink(input: {originUrl, subIds})  { shortLink }` |
| Consultar oferta | query `productOfferV2(itemId?, keyword?, ...) { nodes { itemId productName commissionRate sales ratingStar offerLink ... } }` |
| Relatório de conversão | query `conversionReport(purchaseTimeStart, purchaseTimeEnd, orderStatus, ...)` — **não implementado nesta fase**, arquitetura preparada pra receber depois |

`lib/shopee/signature.ts` implementa a assinatura, testado contra um hash recalculado
independentemente (não copiado da implementação). `lib/providers/shopee-provider.ts` usa
`productOfferV2` pra catálogo/comissão real e `generateShortLink` pra gerar o link de
afiliado com nossos `sub_ids`.

## Sub_ids — como a atribuição PRECOCAINDO funciona na Shopee

`lib/services/shopee-attribution.ts`. Posicional, até 5 slots:

| Posição | Conteúdo | Sempre presente? |
| --- | --- | --- |
| `sub_id1` | `SHOPEE_SUB_ID1` (padrão `"precocaindo"`) | Sim, nunca sobrescrevível por chamada |
| `sub_id2` | `source` (ex. `admin_queue`, `showcase`) | Se fornecido |
| `sub_id3` | `category` | Se fornecido |
| `sub_id4` | `campaign` | Se fornecido |
| `sub_id5` | `opportunityId` (ex.: `MerchantListing.id`) | Se fornecido |

Cada valor passa por `normalizeSubId()` (só alfanumérico, acentos removidos) antes de ir pro
array — restrição confirmada da Shopee. Posições intermediárias vazias viram `""`, nunca são
puladas (senão `sub_id4` poderia significar coisas diferentes dependendo do que foi
preenchido).

**Isso é o que separa a receita do PreçoCaindo de qualquer outra coisa que passe pela mesma
conta Shopee**: todo link que geramos carrega `sub_id1=precocaindo`.

## Mercado Livre — token, mas não bloqueio arquitetural

`MERCADO_LIVRE_ACCESS_TOKEN` é necessário só pro **cérebro** (catálogo, trends, highlights) —
nunca pra gerar link de afiliado (isso é humano). Enquanto o token não existe, tudo relacionado
continua falhando explícito, sem chamar rede — mas isso não bloqueia nada do resto do sistema
(`MonetizationScore`, `ProductMatcher`, `AffiliateLinkRegistry`, a fila do admin — todos
funcionam sem ele, só não têm dado ML real pra trabalhar).

`scripts/ml-demand-e2e-check.ts` — script manual (nunca automatizado/job) pra validar de
verdade assim que o token existir:

```bash
npx tsx scripts/ml-demand-e2e-check.ts --category MLB1051 --item MLB123456 --persist
```

Sem `--persist`, só imprime o que achou. Com `--persist`, grava `MerchantListing` +
`MerchantListingSignal` reais (nunca `AffiliateLinkRegistry` — isso continua exclusivamente
humano/API).

## Limitação conhecida

`MercadoLivreBestsellerDemandSource.collect()` (o `DemandSignal` genérico, usado pelo
DemandEngine) carrega só o título resolvido, não o `itemId` real — `DemandSignal` é uma
interface compartilhada (`lib/demand/types.ts`) que não devia mudar só por conveniência
desta fonte. Quem precisa do `itemId` real (como `scripts/ml-demand-e2e-check.ts`, pra
persistir `MerchantListing`) usa `collectRaw()` em vez de `collect()`.
