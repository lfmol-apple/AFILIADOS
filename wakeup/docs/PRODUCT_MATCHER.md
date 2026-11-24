# ProductMatcher — Shadow Mode (2026-09-08)

## Estado antes desta fase

`lib/services/product-matcher.ts` e o schema `ProductMatchEvidence` já existiam, mas **nunca eram
chamados por nenhum código de aplicação** — `ProductMatchEvidence` tinha 0 linhas em produção.
Este documento cobre o trabalho que conecta esse matcher já existente a dados reais, mantendo os
resultados em **shadow mode** (banco/`AutomationRun`, nunca superfície pública).

## Qualidade real dos dados (auditado em produção, 2026-09-08)

| Campo | Mercado Livre (639 listings) | Shopee (24 listings) |
| --- | --- | --- |
| título | 100% (via `CanonicalProduct.title`) | 100% (via `MerchantListingSignal.raw.productName`) |
| brand | 100% | **0% — campo não existe na resposta real da API** |
| model | 100% | **0% — idem** |
| GTIN | **0%** | **0% — idem** |
| manufacturer/product ID | não coletado por nenhuma fonte hoje | não coletado |

**Shopee**: `productOfferV2` foi inspecionado exaustivamente contra o `raw` já persistido em
produção — todas as chaves já observadas em qualquer payload real: `commission,
commissionRate, imageUrl, itemId, offerLink, priceDiscountRate, priceMax, priceMin,
productLink, productName, ratingStar, sales, sellerCommissionRate, shopId, shopName,
shopType, shopeeCommissionRate`. Nenhum campo de marca/modelo/GTIN/categoria existe. Isso é uma
limitação real da API confirmada com dado real, não um bug de coleta — não foi inferido/regex'ado
nada para compensar.

**Mercado Livre**: `GTIN` veio vazio nos 35 `CanonicalProduct` reais existentes (a fonte
`findAttribute(detail, "GTIN")` simplesmente não encontrou o atributo nos produtos observados até
agora). `manufacturerId` nunca foi coletado por nenhum job — gap documentado, não inventado.

**Consequência estrutural**: com os dados reais de hoje, os níveis `GTIN` e `MANUFACTURER_ID`
(os únicos que podem produzir `CONFIRMED`) não têm nenhum dado real para operar sobre —
`CONFIRMED` real = 0 é o resultado esperado, não uma falha do matcher.

## Risco de variante — confirmado em dado real, não hipotético

A auditoria encontrou, nos 35 `CanonicalProduct` reais de Mercado Livre:

- `model: "Galaxy A17"` em dois produtos com o mesmo storage (128GB) mas cor diferente — caso
  legítimo, não bloqueado.
- `model: "iPhone 17"` em dois produtos com storage **diferente** (512GB vs 256GB) — exatamente o
  cenário "Galaxy A17 128GB ≠ automaticamente Galaxy A17 256GB" do brief, encontrado ao vivo.

`lib/services/product-variant-guard.ts` (novo) extrai capacidade de armazenamento (GB/TB, pegando
o maior valor no título — RAM também aparece em GB nos títulos reais), voltagem (110/127/220V) e
palavras de tier (Pro/Plus/Ultra/Max/Mini/SE) do título, e bloqueia (retorna `null`, nunca
`CANDIDATE`) qualquer par nos níveis `BRAND_MODEL`/`TEXTUAL_CANDIDATE` cujos títulos discordem em
capacidade ou voltagem, ou cujos conjuntos de palavras de tier sejam diferentes — incluindo o caso
de uma palavra de tier aparecer só de um lado ("iPhone 16" vs "iPhone 16 Pro"), decisão deliberada:
um falso negativo aqui não custa nada; um `CANDIDATE` errado seria exatamente o problema que esta
fase existe para evitar. Cor **não** é verificada — "mesmo modelo, cor diferente" continua sendo
um `CANDIDATE` legítimo.

## Regras reais do matcher (`lib/services/product-matcher.ts`)

| Nível | Input | Confidence | Status | Proteção |
| --- | --- | --- | --- | --- |
| `GTIN` | GTIN normalizado + **validado** (dígito verificador GS1 real, `lib/services/gtin.ts`, comprimento 8/12/13/14) | 1.0 | `CONFIRMED` | valor inválido nunca é comparado, mesmo se textualmente igual em ambos os lados |
| `MANUFACTURER_ID` | string normalizada | 0.95 | `CONFIRMED` | — |
| `BRAND_MODEL` | brand+model normalizados, exato | 0.75 | `CANDIDATE` (nunca `CONFIRMED`) | guarda de variante |
| `TEXTUAL_CANDIDATE` | Jaccard de shingles de 3 palavras do título, limiar 0.35 | min(similaridade, 0.6) | `CANDIDATE` (nunca `CONFIRMED`) | guarda de variante |

`MATCHER_VERSION = "v1"` é gravado em todo `MatchEvidence.evidence.matcherVersion` — sem migração
de schema (o campo `evidence` já é `Json` livre).

## Geração de candidatos (`lib/services/product-match-candidates.ts`)

Nunca compara cada listing com todos os outros. Cascata, na ordem do brief:

1. **GTIN validado** — agrupamento O(n), permitido intra ou cross-merchant (um identificador real
   é confiável nos dois casos).
2. **manufacturerId** — mesmo padrão (hoje sempre vazio, sem efeito real).
3. **brand+model normalizado** — **somente cross-merchant**. Intra-Mercado-Livre já é resolvido
   por `canonicalProductId` (toda oferta real de um produto de catálogo já compartilha o mesmo
   `canonicalProductId` — ver `lib/services/ml-enrichment-collector.ts`), então repetir isso aqui
   seria desperdiçar processamento provando o óbvio (brief seção 7).
4. **textual** — **somente cross-merchant**, e somente dentro de um universo restrito: um índice
   invertido de tokens significativos do título (≥4 caracteres, não numérico, fora de uma lista
   curta de stopwords) — dois listings só são comparados se compartilham pelo menos um token.
   Nunca um N×N cego.

Do lado Mercado Livre, o candidato usado por produto de catálogo é **um representante** (a linha
de catálogo, ou a de menor id como fallback) — não as ~17 ofertas reais que compartilham o mesmo
`canonicalProductId`, pelo mesmo motivo do item 3 acima. 639 listings ML → 35 representantes reais.

## Shadow mode — decisão sobre `CONFIRMED` (brief seção 9)

O comentário original do schema (`ProductMatchEvidence`) previa que um `CONFIRMED` pudesse setar
`MerchantListing.canonicalProductId`. **Decisão desta fase: não fazer isso, nem para
`CONFIRMED`.** `getUnifiedMerchantOffers()` (`lib/queries/unified-offers.ts`) já usa
`canonicalProductId` para agrupar ofertas de Mercado Livre nas superfícies públicas (`/ofertas`,
busca, Home, Radar) — escrever nele aqui arriscaria mudar o que essas páginas renderizam, violando
a regra absoluta desta fase ("não alterar superfície pública"). Todo resultado, `CONFIRMED`
incluído, fica exclusivamente em `ProductMatchEvidence`. Reavaliar isso é trabalho da próxima fase,
com aprovação explícita.

## Idempotência (brief seção 13)

`ProductMatchEvidence.@@unique([listingAId, listingBId])` só deduplica UMA ordem — sem
normalização, rodar o matcher duas vezes com os dois lados visitados em ordem diferente criaria
uma segunda linha invertida para o mesmo par real. `product-match-shadow.ts` sempre ordena
`[listingAId, listingBId]` lexicograficamente antes de `upsert`, então A↔B nunca duplica como B↔A,
e uma reexecução atualiza a linha existente em vez de duplicá-la.

## Ativação (brief seções 18/23/24)

Primeira execução: manual, controlada, direto em produção via `npx tsx jobs/product-matcher-shadow.ts`
(mesmo mecanismo `docker run` já usado para os outros jobs) — **não** integrado ao ciclo automático
até essa execução ser auditada por um humano. Resultado real (2026-09-08, produção): 35
representantes ML + 24 listings Shopee = 59 elegíveis, 39 pares candidatos considerados (todos
via o nível textual, cross-merchant — nenhum GTIN/manufacturerId/brand+model real disponível para
gerar candidatos nos outros níveis), **0 CONFIRMED, 0 CANDIDATE** — todos os 39 pares tinham
similaridade Jaccard 0.000 (catálogo de celulares/eletrônicos do ML vs. amostra real de
skincare/limpeza/pet da Shopee, genuinamente sem sobreposição). Antes/depois idêntico
(`ProductMatchEvidence` 0→0, `canonicalProductId` de ML 643→643 inalterado, Shopee 0→0), 103ms de
duração. Guarda de variante confirmada com dado real: dois `CanonicalProduct` reais "iPhone 17"
(512GB vs 256GB) corretamente bloqueados de um `CANDIDATE`, apesar de brand+model idênticos.

Gate (brief seção 23) — nenhum dos bloqueios ocorreu: sem falso `CONFIRMED`, sem duplicação, sem
performance ruim, sem crescimento explosivo de candidatos, sem alteração pública, sem
inconsistência de `CanonicalProduct`. `PRODUCT_MATCHER_SHADOW` foi então adicionado como quarto
passo de `jobs/run-ml-shopee-cycle.ts`, reutilizando o cron já existente (a cada 4h) — nenhum
scheduler novo.

## Falha isolada (brief seção 16)

`jobs/product-matcher-shadow.ts` roda dentro de `runJob("PRODUCT_MATCHER_SHADOW", ...)` — mesma
trava/observabilidade dos outros jobs. Nunca chama rede (só lê o que `ML_DEMAND`/`ML_ENRICHMENT`/
`SHOPEE_REFRESH` já persistiram) — não tem retry/backoff próprio porque não há erro transitório de
rede para retentar aqui; uma falha é um bug real ou um dado inesperado, e deve aparecer como
`FAILED` imediatamente. Uma falha aqui nunca desfaz ou apaga o que os três jobs de coleta já
persistiram no mesmo ciclo — o matcher só lê, nunca escreve em `MerchantListing`/
`MerchantListingSignal`/`MonetizationScore`.
