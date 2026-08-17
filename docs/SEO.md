# SEO

## O que já está implementado

- **Metadata dinâmica** por página via `generateMetadata` (produto, categoria, melhores,
  comparações), com `title`, `description`, `alternates.canonical` e Open Graph.
- **Open Graph dinâmico** por produto: `app/produto/[slug]/opengraph-image.tsx` gera uma imagem
  1200×630 com título, preço e o rótulo do Score no momento do request.
- **Sitemap** (`app/sitemap.ts`): inclui páginas estáticas, todos os produtos ativos, categorias
  ativas e conteúdo `PUBLISHED` — nunca páginas vazias ou sem valor. Revalida a cada hora.
- **Robots** (`app/robots.ts`): libera tudo exceto `/admin` e `/go/amazon/` (rota de redirect, sem
  valor de indexação e que não deve receber crawler).
- **Structured data (JSON-LD)**:
  - `WebSite` e `Organization` no layout raiz;
  - `Product` na página de produto — com uma decisão deliberada: `offers.seller` é sempre
    `"Amazon.com.br"`, nunca "PreçoCaindo", porque o PreçoCaindo não vende o produto (seção 12 do
    briefing). `aggregateRating` só é emitido quando a Amazon forneceu `rating`/`reviewCount`.
- **Breadcrumbs** visuais em todas as páginas de entidade (ainda sem `BreadcrumbList` JSON-LD —
  ver pendências abaixo).
- **URLs limpas e slugs estáveis**: `lib/services/slug.ts` gera slugs a partir do título,
  removendo acentos, e só cai para um sufixo derivado do ASIN em caso de colisão
  (`generateUniqueSlug`), o que reduz a chance de o slug de um produto mudar depois de publicado.
- **Paginação real** em `/ofertas` (`?page=`), sem duplicar conteúdo entre páginas.

## Controle de qualidade antes de publicar (SEO programático)

O objetivo não é gerar milhões de páginas — é gerar automaticamente só páginas que merecem
existir (seção 13 do briefing). Isso é aplicado em duas camadas:

1. **Nível de dado**: `DISCOVER_CONTENT_OPPORTUNITIES` só enfileira produtos que já têm
   `OpportunityScore` calculado (ou seja, dados mínimos suficientes).
2. **Nível de conteúdo**: `ContentQualityGate` (`lib/services/content-quality-gate.ts`) roda antes
   de qualquer publicação e recusa (`FAIL`) conteúdo curto demais, sem estrutura editorial mínima,
   ou que é essencialmente uma cópia da ficha do marketplace (compara o tamanho do corpo ao
   tamanho da descrição de origem). `REVIEW` sinaliza problemas menores para revisão humana antes
   de aprovar.
3. **Publicação em si é opt-in**: mesmo conteúdo `APPROVED` só é publicado se `AUTO_PUBLISH=true`
   (padrão: `false`) — ver `jobs/publish-content.ts`.

## Pendências conhecidas (próximos passos de SEO)

- `BreadcrumbList` JSON-LD (o componente visual existe; falta o schema correspondente).
- `FAQPage` JSON-LD — o briefing pede isso "somente quando fizer sentido e em conformidade com as
  políticas vigentes"; não implementado ainda porque nenhuma página gera FAQ hoje.
- Redirects automáticos quando um slug de produto muda (hoje a geração de slug minimiza a chance
  de mudança, mas não há uma tabela de redirects 301 ainda).
- `noindex` explícito para páginas de baixa qualidade que ainda assim precisem existir (hoje a
  estratégia é simplesmente não publicar — não há um estado "publicado mas noindex").
