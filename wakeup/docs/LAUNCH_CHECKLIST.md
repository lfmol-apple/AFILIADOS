# Launch checklist — primeira coorte real

Este documento **não liga nada**. Existe para que, quando a pesquisa real de mercado e a escolha
dos primeiros 15-25 produtos estiverem prontas, o passo a passo de publicação seja mecânico e
verificável — sem inventar nenhuma etapa nova na hora.

## O que muda quando decidirmos lançar

Hoje, em produção: `PUBLIC_CATALOG_ENABLED=false`, `MANUAL_PRODUCTS_ENABLED=false`,
`AUTO_PUBLISH=false`, `AMAZON_PROVIDER=mock`. Nenhuma dessas quatro é alterada por este documento.

Quando a coorte estiver revisada e pronta:

1. **Cadastrar a coorte** — `npm run product:add` (ou `candidate:add` + `candidate:promote`) para
   cada produto, um a um, com ASIN real, categoria, e conteúdo editorial próprio. Ver
   docs/COHORT.md.
1. **Rodar o backfill multiloja** — depois da migration, `npm run merchant:backfill-amazon` cria
   `CanonicalProduct`, `Merchant` e `MerchantListing` para os produtos existentes sem apagar nada.
1. **Revisar as páginas** — visitar `/produto/[slug]` de cada produto localmente/staging
   (o produto já é visível para revisão manual com `MANUAL_PRODUCTS_ENABLED=true` só no ambiente
   de revisão, catálogo ainda fechado ao público em produção).
1. **Validar os links** — para cada produto, abrir `/go/amazon/[asin]`, confirmar redirect para
   `amazon.com.br/dp/<ASIN>?tag=<TRACKING_ID_CONFIRMADO>`, confirmar `AffiliateClick` gravado. Nunca
   comprar.
1. **Ativar os produtos revisados** — `npm run product:activate -- --asin <ASIN>` para cada um.
1. **`PUBLIC_CATALOG_ENABLED=true`** em produção.
1. **`MANUAL_PRODUCTS_ENABLED=true`** em produção.
1. **Manter `AUTO_PUBLISH=false`** — não existe publicação automática de conteúdo/produto nesta
   fase, e não deve existir até o `ContentEngine` também operar sobre `MANUAL_VERIFIED` (fora de
   escopo desta coorte).
1. **Rebuild/redeploy** se qualquer uma das flags acima exigir rebuild da imagem (variáveis
   `NEXT_PUBLIC_*` exigem rebuild; as quatro flags de catálogo são lidas em runtime via
   `lib/config/env.ts`, não exigem rebuild — só reiniciar o container).
1. **Verificar `robots.txt`** — `/produto/`, `/ofertas`, `/categorias/`, `/melhores/`,
   `/comparar/` devem ter saído do `disallow` (`app/robots.ts`).
1. **Verificar `sitemap.xml`** — deve listar exatamente os produtos `active=true` +
   `dataSource` visível, nenhum `MOCK`, nenhuma categoria vazia, além de `/guias` e guias
   editoriais estáticos (`app/sitemap.ts`).
1. **Verificar `canonical`** — cada página de produto aponta para sua própria URL
   (`generateMetadata` → `alternates.canonical`).
1. **Verificar JSON-LD** — `Product` (com `offers` só quando há preço verificado, nunca
   inventado), `BreadcrumbList` — inspecionar com o Rich Results Test do Google antes de enviar.
1. **Verificar as páginas publicamente** — acessar cada `/produto/[slug]` já em produção, como
   visitante real (sem sessão admin), confirmar que carrega e que o CTA da Amazon funciona.
1. **Configurar Search Console** — ver seção dedicada abaixo. Só depois do item 13.
1. **Enviar o sitemap** — `https://precocaindo.com.br/sitemap.xml`, dentro do Search Console.
1. **Acompanhar indexação** — Search Console → Cobertura, alguns dias/semanas depois.
1. **Acompanhar `AffiliateClick`** — `/admin`, diariamente no início.
1. **Acompanhar Amazon** — painel de Associados, relatório de pedidos/comissão (com atraso,
   nunca em tempo real — ver docs/GROWTH_METRICS.md "Limitações de atribuição").

## Google Search Console — procedimento (não executado nesta sprint)

Só é executado depois do item 13 acima — nunca antes de existir pelo menos uma página pública
real.

1. **Propriedade recomendada**: tipo "Domínio" (`precocaindo.com.br`) em vez de "Prefixo de URL" —
   cobre `https://precocaindo.com.br` e qualquer variante (`www`, `http`) automaticamente.
2. **Verificação**: via **registro DNS TXT** no provedor do domínio (Registro.br) — não exige
   nenhuma alteração de código nem arquivo no servidor. Alternativa, se preferível: meta tag HTML
   no `<head>` (exigiria adicionar `verification: { google: "..." }` em
   `app/layout.tsx`'s `metadata`, hoje não presente).
3. **Sitemap**: enviar exatamente `https://precocaindo.com.br/sitemap.xml` em
   Sitemaps → Adicionar novo sitemap.
4. **Inspeção de URL**: para cada produto publicado, rodar "Inspecionar URL" → "Solicitar
   indexação" manualmente, um a um, na primeira leva (a indexação orgânica das próximas páginas
   acontece sozinha depois que o Google já conhece o padrão do site).
5. **Cobertura**: acompanhar Índice → Páginas — confirmar que as páginas de produto aparecem como
   "Indexada" e nenhuma página institucional/admin aparece como erro.
6. **Performance/Resultados de pesquisa**: depois de indexado, acompanhar impressões, cliques,
   CTR e posição média por página e por query — são os números "Organic *" de
   docs/GROWTH_METRICS.md.
7. **Dados estruturados**: usar o Rich Results Test antes do envio para confirmar que o JSON-LD de
   `Product`/`BreadcrumbList` está sem erros — nenhuma alteração de código prevista aqui, é só
   verificação do que já existe.

Nenhuma dessas ações é feita nesta sprint — nenhuma conta Google é acessada, nenhuma propriedade é
criada.

## O que NÃO está nesta lista (fora de escopo)

- Seleção dos produtos da primeira coorte (pesquisa de mercado real — próxima etapa).
- Ativação da Creators API.
- Qualquer alteração ao PETMOL.
