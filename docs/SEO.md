# SEO

## O que já está implementado

- **Metadata dinâmica** por página via `generateMetadata` (produto, categoria, melhores,
  comparações), com `title`, `description`, `alternates.canonical` e Open Graph.
- **Open Graph dinâmico** por produto: `app/produto/[slug]/opengraph-image.tsx` gera uma imagem
  1200×630 com título, preço e o rótulo do Score no momento do request.
- **Sitemap** (`app/sitemap.ts`): inclui páginas estáticas, produtos ativos **indexáveis**
  (`lib/seo/indexability.ts` — ver abaixo), categorias ativas e conteúdo `PUBLISHED` com
  `noindex=false`. Nunca páginas vazias, redirects, ou conteúdo marcado noindex. Revalida a cada
  hora.
- **Robots** (`app/robots.ts`): libera tudo exceto `/admin`, `/go/amazon/` e `/api/` (rotas sem
  valor de indexação que não devem receber crawler).
- **Structured data (JSON-LD)**:
  - `WebSite` e `Organization` no layout raiz;
  - `Product` na página de produto — com uma decisão deliberada: `offers.seller` é sempre
    `"Amazon.com.br"`, nunca "PreçoCaindo", porque o PreçoCaindo não vende o produto (seção 12 do
    briefing). `aggregateRating` só é emitido quando a Amazon forneceu `rating`/`reviewCount`.
  - `BreadcrumbList` na página de produto e de categoria, construído a partir dos mesmos itens que
    o componente visual `<Breadcrumbs />` recebe (`lib/seo/structured-data.ts`) — uma única fonte
    de verdade, para o schema nunca divergir do que está na tela.
- **URLs limpas e slugs estáveis**: `lib/services/slug.ts` gera slugs a partir do título,
  removendo acentos, e só cai para um sufixo derivado do ASIN em caso de colisão
  (`generateUniqueSlug`), o que reduz a chance de o slug de um produto mudar depois de publicado.
- **Redirects permanentes de slug**: `SlugRedirect` (`lib/seo/slug-redirect.ts`) registra 301s
  quando um slug publicado muda, com prevenção explícita de loop (A→B não pode depois virar B→A,
  nem em ciclos maiores) e colapso de cadeias (A→B, depois B→C vira A→C e B→C, nunca um duplo
  hop). Aplicado em `proxy.ts` (o renomeado `middleware` do Next 16), escopado só às rotas com
  slug (`/produto`, `/categorias`, `/melhores`, `/comparar`).
- **`noindex` decidido por dados reais**: a página de produto e o sitemap usam a mesma função
  (`isProductPageIndexable()`) para decidir se um produto tem conteúdo real o bastante (descrição,
  especificações, ou histórico de preço) para valer a indexação — os dois nunca podem discordar,
  porque compartilham a mesma lógica.
- **Paginação real** em `/ofertas` (`?page=`), sem duplicar conteúdo entre páginas.

## Controle de qualidade antes de publicar (SEO programático)

O objetivo não é gerar milhões de páginas — é gerar automaticamente só páginas que merecem
existir (seção 13 do briefing, e Partes F/G da Sprint 2). Isso é aplicado em três camadas:

1. **Nível de dado**: `DISCOVER_CONTENT_OPPORTUNITIES` só enfileira produtos que já têm
   `OpportunityScore` calculado, pontuados pelo `DemandEngine` (docs/DEMAND_ENGINE.md) — não
   apenas "o produto existe".
2. **Nível de conteúdo**: `ContentQualityGate` (`lib/services/content-quality-gate.ts`) roda antes
   de qualquer publicação e recusa (`FAIL`) conteúdo curto demais, sem estrutura editorial mínima,
   que é essencialmente uma cópia da ficha do marketplace, **quase idêntico a outra página já
   publicada** (checagem de similaridade via `lib/services/similarity.ts`, sem depender de LLM), ou
   que dá a entender que o PreçoCaindo vende o produto. `REVIEW` sinaliza problemas menores para
   revisão humana antes de aprovar.
3. **Nível de publicação**: `PublicationDecisionEngine` (`lib/services/publication-decision.ts`)
   decide `CREATE` / `UPDATE` / `KEEP` / `NOINDEX` / `REJECT` combinando dado real, qualidade,
   demanda e originalidade — nunca publica só porque "temos um ASIN". Mesmo conteúdo `APPROVED`
   só é efetivamente publicado se `AUTO_PUBLISH=true` (padrão: `false`) — ver
   `jobs/publish-content.ts`.

## Pendências conhecidas (próximos passos de SEO)

- `FAQPage` JSON-LD — o briefing pede isso "somente quando fizer sentido e em conformidade com as
  políticas vigentes"; não implementado ainda porque nenhuma página gera FAQ hoje.
- `resolveSlugRedirect()` consulta o banco a cada request nas rotas cobertas por `proxy.ts` — sem
  problema no volume atual, mas antes de tráfego real vale adicionar um cache em memória de TTL
  curto na frente dessa consulta.
- Checagem de duplicação em `ContentQualityGate` compara contra até 200 páginas publicadas do
  mesmo tipo por comparação par-a-par — funciona bem na escala atual, mas não escala
  indefinidamente; um índice de similaridade dedicado é a evolução natural quando o catálogo de
  conteúdo publicado crescer muito.
