# Arquitetura da experiência pública

Reorganização de 2026-09-08 — projeto brief: "o site está ficando disperso...
organizar pela jornada (DESCOBRIR → ENTENDER → COMPARAR → DECIDIR → COMPRAR),
não por marketplace."

## Diagnóstico (dado real, confirmado ao vivo antes de qualquer mudança)

```
products: 0   categories: 0   bestOf: 0   comparisons: 0
shopee (ativos): 12   mercado livre (ativos): 200
```

`/produto`, `/categorias`, `/melhores`, `/comparar` — a "arquitetura principal"
histórica, toda construída em cima de `Product` (Amazon) — tinham **zero**
conteúdo real em produção. Os 212 listings comerciais reais (Shopee+ML)
viviam quase inteiramente à margem: só no Radar (Home) e num showcase
pequeno no rodapé de `/ofertas`. Essa dissonância era a causa raiz da
dispersão relatada.

A Home tinha 13 blocos, com duplicações reais: duas seções "🔥" (Amazon
vazio vs. Radar real), dois conceitos de "categoria" na mesma página, dois
blocos institucionais quase idênticos (Motor de decisão + Metodologia).

## O que mudou

### Home (`app/page.tsx`) — 13 blocos → 7

1. Hero + busca (inalterado)
2. Radar — `components/radar-feed.tsx` (inalterado, já era cross-merchant)
3. **🏆 Melhores oportunidades agora** (novo) — Amazon + Shopee + Mercado
   Livre numa grade só, nunca "Achados Shopee"/"Achados ML" separados
4. Achados na Amazon (`AmazonBrShowcase`) — conteúdo real, curado à mão,
   mantido como elemento auxiliar; agora retorna `null` se algum dia ficar
   vazio (nunca reserva espaço vazio)
5. Categorias reais (a antiga "Categorias editoriais" estática foi removida
   — duplicava o conceito sem necessidade)
6. Guias em destaque
7. "Como o PreçoCaindo decide" (fusão de "Motor de decisão de compra" +
   "Metodologia")

**Removido**: "🔥 Preços caindo agora" (Amazon), "🏆 Boas compras agora"
(Amazon) e o fallback "Produtos populares monitorados" como blocos
próprios — o sinal de oportunidade real da Amazon (`OpportunityScore`,
inalterado) agora entra na seção 3 unificada quando existir produto real;
hoje (0 produtos) simplesmente não contribui nenhum card, sem placeholder
vazio.

**Aviso de pré-lançamento**: antes disparava só pelo gate da Amazon
(`currentlyVisibleDataSources()`), o que hoje mostraria "catálogo ainda não
publicado" com 212 listings reais no ar — corrigido para só aparecer
quando não há **nenhum** conteúdo comercial real (Radar + oportunidades
unificadas, juntos).

### `/ofertas` (`app/ofertas/page.tsx`) — vitrine multiloja de verdade

- **Com busca** (`?q=`): inalterado — continua Amazon-only (motor de busca
  cross-merchant é passo futuro explícito, fora desta rodada).
- **Sem busca** (padrão): antes era grade Amazon + `ShopeeShowcase` colado
  no rodapé. Agora é **uma grade só**, Amazon+Shopee+ML juntos, ordenada
  pelo sinal real de oportunidade de cada um (ver `UnifiedOfferCard`
  abaixo) — sem seção por loja.

### `lib/queries/unified-offers.ts` (novo)

View-model de apresentação `UnifiedOfferCard` — **não é um novo modelo
comercial**, é só o formato compartilhado para renderizar Amazon/Shopee/ML
num único card. Cada campo é `nullable` quando a fonte não fornece (nunca
inventa preço, desconto, rating, vendas). Alimenta tanto a Home quanto
`/ofertas` — um só lugar de verdade.

**`opportunitySignal` — decisão importante**: nunca é o `MonetizationScore`
bruto (que mistura comissão). Para Shopee/ML é a média dos componentes
`demand` + `offerQuality` já calculados em `MonetizationScore.components`
— excluindo explicitamente `commission`. Para Amazon é o `OpportunityScore`
existente, inalterado (já era comissão-neutro por design). Isso cumpre a
regra do briefing: "nunca alterar OpportunityScore nem MonetizationScore
apenas para facilitar UI" — nenhum dos dois foi tocado; só se leu um
subconjunto já real e já computado deles.

**Elegibilidade**: só entram itens com `AffiliateLinkRegistry.status ===
"ACTIVE"` (Shopee/ML) ou uma `Offer` real (Amazon) — fail-closed preservado.
O Radar continua sendo o único lugar onde uma oportunidade sem link ainda
aparece (como inteligência, nunca como oferta comprável) — regra explícita
do briefing, não alterada.

### `/guias` (`app/guias/page.tsx`)

Passa a descobrir conteúdo de `/melhores` e `/comparar`
(`GeneratedContent`, `PUBLISHED`, não-`noindex`) numa seção "Rankings e
comparações" — só renderiza se houver conteúdo real (hoje: nenhum, então a
seção não aparece — nenhuma seção vazia). URLs de `/melhores/[slug]` e
`/comparar/[slug]` **inalteradas**, nenhum redirect necessário.

### Header / Footer

Header: inalterado (já era `Logo | Busca | Ofertas | Guias | Como funciona
| Transparência`, exatamente o pedido). Footer: adicionado `/ofertas` (o
briefing pediu explicitamente "Ofertas e Guias devem ser encontráveis" —
Guias já estava, Ofertas faltava).

## O que foi preservado, sem tocar

`ProductMatcher`, `OpportunityScore`, `MonetizationScore`,
`MerchantListing`, `MerchantListingSignal`, `AffiliateLinkRegistry`,
`AffiliateClick`, Radar (`lib/services/radar.ts`/`lib/queries/radar-events.ts`),
integração ML (OAuth, token refresh, fila manual), integração Shopee,
Amazon (rotas, compliance, testes), atribuição `precocaindo`. Nenhuma URL
pública foi removida ou redirecionada.

## Próximos passos registrados (não implementados nesta rodada)

- `/categorias` cross-merchant (Shopee/ML hoje não têm categoria própria).
- Busca cross-merchant de verdade (`/ofertas?q=` continua Amazon-only).
- Página de produto/oportunidade dedicada para Shopee/ML (hoje só Amazon
  tem `/produto/[slug]`).
