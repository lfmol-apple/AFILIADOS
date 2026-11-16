# Rascunhos de criativo — Campanha A e Campanha C

Texto puro, pra revisão do dono antes de qualquer configuração no Meta Ads
Manager (sem credencial/conta conectada neste repositório — nada aqui é
enviado a lugar nenhum automaticamente). Nenhuma promessa de desconto,
"menor preço" ou resultado garantido — regra do projeto, sem exceção.

## Campanha A — aquisição de seguidores do Canal

Destino: `/canal` (página de convite, `app/canal/page.tsx`).

**Variante 1 — comparação entre lojas**
> Mercado Livre, Amazon e Shopee, comparados antes de você decidir.
> Promoções reais, cupons verificados, sem spam. Canal gratuito.

**Variante 2 — critério, não volume**
> Cansado de canal de promoção cheio de link morto? O Preço Caindo só
> publica o que tem prova real por trás. Entre de graça no Canal.

**Variante 3 — direto ao ponto**
> Promoções reais no WhatsApp, sem mensalidade. Preço Caindo: comparação
> entre lojas, cupom verificado, zero spam.

## Campanha C — ofertas específicas

Destino: página do produto (`/produto/[slug]`) — só produtos que passarem
em `evaluateAdsEligibility` (`lib/services/ads-eligibility.ts`): página
publicável, link revalidado nas últimas 24h, queda de preço real
confirmada. Texto final é gerado por produto quando a oferta for escolhida
— estes são só o tom/estrutura.

**Estrutura por produto:**
> [Nome do produto] caiu [X]% — confira o preço atual e a loja no Preço
> Caindo. [chamada curta, ex: "Comparação real, sem link morto."]

Nunca: "última chance", "corre que acaba", número de estoque, contagem
regressiva — nenhum desses dados existe no sistema hoje; afirmar isso
seria inventar urgência.

## Checklist antes de qualquer anúncio ir ao ar

- [ ] Produto passou em `evaluateAdsEligibility` nas últimas 24h (não só
  "passou alguma vez").
- [ ] Link testado manualmente pelo dono uma vez antes da ativação.
- [ ] Orçamento e duração definidos e aprovados.
- [ ] Critério de parada (ver plano de lançamento) revisado.
