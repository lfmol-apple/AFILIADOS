# Fila de candidatos a produto (`ProductCandidate`)

## Para que serve

`ProductCandidate` (`prisma/schema.prisma`) é a fila de inteligência comercial/SEO onde um ASIN
real, escolhido estrategicamente, é registrado e avaliado **antes** de se tornar um `Product`
público. É deliberadamente um modelo separado de `Product` — nunca é lido por nenhuma query
pública (`lib/queries/products.ts`, `app/sitemap.ts`, `app/robots.ts`), então a justificativa
comercial interna (`rationale`) e os scores heurísticos nunca podem vazar para uma página que um
visitante veja. Ver `docs/AMAZON.md` → "Origem dos dados" para como `Product.dataSource` se
encaixa depois da promoção.

## Fluxo conceitual

```text
pesquisa de mercado / oportunidade identificada
↓
ProductCandidate (status = CANDIDATE)
↓
avaliação interna (scores heurísticos 0-100, todos opcionais)
↓
status = APPROVED
↓
verificação humana dos dados (título real, categoria, ASIN válido, disponibilidade legítima)
↓
promoção manual e controlada → cria/atualiza um Product com dataSource = MANUAL_VERIFIED
↓
status = PROMOTED, productId aponta para o Product criado
```

`status = REJECTED` é o resultado válido quando o candidato não avança — não precisa e não deve
ser promovido só para "não desperdiçar" o registro.

## Campos heurísticos — nunca inventados, nunca automáticos

`searchPotential`, `purchaseIntent`, `ticketSize`, `commissionEstimate`, `longTailOpportunity`,
`seoCompetitiveness`, `valuePropositionFit`, `clickProbability` são notas manuais de 0 a 100,
preenchidas por uma pessoa com base em critério próprio — nunca por um modelo de ML, nunca
inferidas de tráfego real do site. Todos são opcionais: só pontue a dimensão sobre a qual você
realmente tem uma opinião fundamentada. `internalScore` é reservado para uma média ponderada
documentada dessas notas — **a função que o calcula ainda não foi implementada**; até que exista,
o campo fica `null` e a priorização entre candidatos é feita lendo os campos individuais.

Nenhum desses campos aparece nunca em uma página pública. Eles existem só para ajudar a decidir
"vale a pena verificar este ASIN a fundo e publicar."

## Ferramenta operacional (CLI)

Nenhuma etapa deste fluxo depende de SQL manual ou do Prisma Studio — seis comandos npm cobrem o
ciclo completo (project brief Sprint 7 seções 4-5; implementação em `lib/services/manual-product-
registration.ts`, `lib/services/candidate-promotion.ts`, `scripts/*.ts`):

```bash
npm run candidate:add      -- --asin <ASIN> --title "..." --rationale "..." [--category <slug>] [scores 0-100 opcionais]
npm run candidate:list     [-- --status CANDIDATE|APPROVED|REJECTED|PROMOTED]
npm run candidate:promote  -- --asin <ASIN> --title "..." --category <slug> --description "..." --confirm

npm run product:add        -- --asin <ASIN> --title "..." --category <slug> --description "..."
npm run product:list       [-- --dataSource all] [--active true|false]
npm run product:activate   -- --asin <ASIN> [--marketplace BR] [--deactivate]
```

Garantias construídas na própria função, não apenas na documentação:

- `dataSource` é sempre `MANUAL_VERIFIED` — nunca um parâmetro que o operador possa setar como
  `MOCK` por engano.
- Nenhum campo de preço, desconto, avaliação, estoque ou URL afiliada é aceito como entrada — eles
  simplesmente não existem no tipo `ManualProductInput`, então não há como "esquecer" de omiti-los.
- ASIN e marketplace são validados com as mesmas funções que `/go/amazon/[asin]` usa
  (`isValidAsin`, `getEnabledMarketplaces`) — nunca uma checagem paralela que possa divergir.
- O produto é sempre criado com `active=false` (rascunho); `product:activate` recusa
  explicitamente qualquer produto com `dataSource=MOCK`.
- `candidate:promote` exige `--confirm` — a promoção nunca é automática nem acidental.
- A URL afiliada exibida é só uma prévia (`buildAmazonProductUrl()`), nunca gravada em `Offer` —
  o link real continua sendo gerado no momento do clique, por `/go/amazon/[asin]`.

Cobertura automatizada equivalente a um "dry run" (sem nunca tocar produção): `tests/manual-
product-registration.test.ts`.

## Conteúdo editorial de um produto promovido

Ao promover um candidato para `Product`, os únicos campos comerciais permitidos são os que têm
fonte legítima e verificável: título, ASIN, categoria, marca (se conhecida), marketplace
(`AMAZON_BR`), e — apenas se houver fonte oficial/permitida com timestamp claro — preço e imagem.
`Product.description` deve ser conteúdo editorial original do PreçoCaindo (o que é, para quem
serve, o que observar antes de comprar, contexto de uso) — nunca a descrição copiada da Amazon,
nunca uma especificação ou avaliação inventada. Um produto sem preço verificado ainda é publicável
com conteúdo editorial honesto — ver `app/produto/[slug]/page.tsx`, que já trata esse caso
mostrando "Ainda estamos acompanhando este produto" em vez de inventar um preço ou histórico.
