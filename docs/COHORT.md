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

## Estado atual da ferramenta (honesto, não aspiracional)

Hoje, `ProductCandidate` existe apenas como modelo de banco — a migration
`20260818163000_product_data_source_and_candidates` já está aplicada. **Ainda não existe** um
script de linha de comando para importar candidatos em lote, listá-los ordenados por score, ou
promover um candidato a `Product` automaticamente. Até que esse tooling seja construído, qualquer
inserção/promoção de candidato é feita manualmente (Prisma Studio — `npm run db:studio`, ou uma
migration de dados pontual), sempre revisada por uma pessoa antes de qualquer `Product` real ser
criado com `dataSource = MANUAL_VERIFIED`. Isso é uma pendência real do projeto, não um recurso
"invisível" — ver o relatório de retomada mais recente para o estado exato.

## Conteúdo editorial de um produto promovido

Ao promover um candidato para `Product`, os únicos campos comerciais permitidos são os que têm
fonte legítima e verificável: título, ASIN, categoria, marca (se conhecida), marketplace
(`AMAZON_BR`), e — apenas se houver fonte oficial/permitida com timestamp claro — preço e imagem.
`Product.description` deve ser conteúdo editorial original do PreçoCaindo (o que é, para quem
serve, o que observar antes de comprar, contexto de uso) — nunca a descrição copiada da Amazon,
nunca uma especificação ou avaliação inventada. Um produto sem preço verificado ainda é publicável
com conteúdo editorial honesto — ver `app/produto/[slug]/page.tsx`, que já trata esse caso
mostrando "Ainda estamos acompanhando este produto" em vez de inventar um preço ou histórico.
