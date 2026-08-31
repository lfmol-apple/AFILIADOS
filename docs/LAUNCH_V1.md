# Launch V1 — motor de decisão de compra

Objetivo da V1: colocar o PreçoCaindo no ar como assistente de decisão, não
como panfleto de promoção.

## Pronto agora

- Home com promessa clara: encontrar preço e decidir se vale comprar.
- Busca pública em `/ofertas`.
- Página de produto com veredito do Decision Engine, melhor preço disponível,
  histórico quando houver e área de alerta.
- Guias editoriais em `/guias` e `/guias/[slug]`.
- Sitemap inclui guias e páginas institucionais mesmo com catálogo fechado.
- Robots bloqueia `/admin`, `/api` e `/go`.
- Arquitetura multiloja expand-only.

## Para publicar catálogo real

1. Rodar migrations.
2. Rodar `npm run merchant:backfill-amazon`.
3. Cadastrar produtos reais `MANUAL_VERIFIED`.
4. Ativar os produtos revisados.
5. Ligar `PUBLIC_CATALOG_ENABLED=true` e `MANUAL_PRODUCTS_ENABLED=true`.
6. Confirmar que nenhum `MOCK` aparece em produção.
7. Verificar `/sitemap.xml`, `/robots.txt`, páginas de produto e redirects.

## Deploy seguro

Não há deploy automático documentado. O procedimento existente está em
`docs/DEPLOYMENT.md`: atualizar o repositório na VPS, rebuild do app com Docker
Compose, `prisma migrate deploy`, health check e verificação manual.

## Não pronto

- Alertas por e-mail reais dependem de `EmailProvider`.
- Integrações não-Amazon dependem de contratos/APIs legítimas.
- Amazon Creators API continua pendente.
