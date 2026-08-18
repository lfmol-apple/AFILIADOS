# Compliance — Programa de Associados Amazon (BR + US)

**Última revisão manual deste documento:** 2026-08-18 (`AMAZON_POLICY_REVIEW_DATE` no `.env`).
O `/admin` mostra um aviso quando essa data está a mais de 90 dias no passado. Atualize a
variável de ambiente *e* esta data sempre que revisar as políticas oficiais.

**Contas (PETMOL NEGOCIOS DIGITAIS LTDA):**

- **BR** — Store ID `petmol-20`. Tracking ID do PreçoCaindo: **`precocaindo-20` (já criado)**.
  Conta ainda **não aprovada** para a Creators API (confirmado na própria página da Amazon).
- **US** — Associate ID `petmol07-20`, vinculado a `petmol.com.br`. `precocaindo.com.br` **não**
  cadastrado nessa conta. Pagamento pendente. Marketplace desabilitado no PreçoCaindo.

Ver docs/AMAZON.md para o detalhamento completo.

Documentos oficiais a revisar periodicamente (não versionados aqui — sempre consultar a fonte
vigente no momento da revisão):

- Contrato Operacional do Programa de Associados Amazon Brasil
- Políticas do Programa de Associados
- Regulamento de Comissões vigente
- Termos/licença da Creators API (incluindo os critérios de elegibilidade — ver docs/AMAZON.md)

Este arquivo é o checklist de engenharia — não substitui uma revisão jurídica.

## Onde cada regra vira código

| Regra | Onde é aplicada |
| --- | --- |
| Nunca redirecionar automaticamente para a Amazon | `/go/amazon/[asin]` e `/go/amazon/[marketplace]/[asin]` só existem como destino de um `<Link>` real; não há nenhum `redirect()` disparado no carregamento de página em nenhuma rota pública. |
| Nunca aceitar destino arbitrário no redirect | `resolveAffiliateRedirect()` (`lib/services/affiliate-redirect.ts`) ignora completamente a query string como fonte de destino; o destino vem só do banco (`Offer.affiliateUrl`) ou é reconstruído a partir do ASIN + tag configurada para o marketplace pedido. |
| Allowlist de hosts Amazon, por marketplace | `assertAllowedAmazonDestination()` (`lib/amazon/policy-guard.ts`) — `amazon.com.br` só para BR, `amazon.com` só para US (e só com `AMAZON_US_ENABLED=true`), sempre `https:`. Um marketplace desabilitado é rejeitado antes mesmo de checar o host. `amzn.to` foi removido deliberadamente (Parte R) por falta de justificativa operacional para aceitar um short link não validável. |
| Tag de afiliado nunca hardcoded/chutada | `AMAZON_BR_ASSOCIATE_TAG`/`AMAZON_US_ASSOCIATE_TAG` via env, centralizados em `lib/config/marketplaces.ts`; `buildAmazonProductUrl()` recusa gerar link sem tag configurada para aquele marketplace. BR usa o Tracking ID confirmado `precocaindo-20` — nunca `petmol-20`. US nunca usa `petmol07-20` (pertence a `petmol.com.br`, não ao PreçoCaindo). |
| Disclosure visível perto do link, não só no rodapé | `<AffiliateDisclosure />` é renderizado ao lado de todo `<AmazonCta />` (`components/amazon-cta.tsx`), não apenas no footer. |
| Texto de disclosure centralizado e atualizável | `AMAZON_ASSOCIATE_DISCLOSURE` no `.env`, lido por `lib/amazon/policy-guard.ts` → `lib/amazon/disclosure.ts`. |
| PreçoCaindo nunca alega vender o produto | CTAs dizem "Ver preço na Amazon" / "Ver oferta na Amazon", nunca "Comprar agora no PreçoCaindo". O JSON-LD `Product.offers.seller` na página de produto é sempre `"Amazon.com.br"`. `ContentQualityGate` também rejeita conteúdo gerado que contenha frases como "adicionar ao carrinho" ou "finalizar compra aqui" (`commercialTransparency`, ver `lib/services/content-quality-gate.ts`). |
| Ranking é do PreçoCaindo, não da Amazon | Toda ocorrência do score é rotulada "Score PreçoCaindo"; a metodologia (`/metodologia`, `/transparencia`) deixa explícito que o cálculo é próprio. |
| Não fabricar histórico de preço | `calculatePriceStats()` nunca reporta `coverageDays` maior que o intervalo realmente coletado; o gráfico de histórico mostra "ainda não temos histórico suficiente" com menos de 2 pontos. |
| Sem scraping em nenhuma camada | Nenhuma dependência de scraping no `package.json`; `AmazonProvider` real lança erro em vez de ter fallback. |
| Cliques não armazenam dado pessoal desnecessário | `AffiliateClick` não tem coluna de IP; nenhuma tabela de analytics (`PageView`, `SearchEvent`) tem coluna de IP. |
| `AUTO_PUBLISH` protege contra publicação descontrolada | Padrão `false`; `PUBLISH_CONTENT` nunca ignora o veredito do `ContentQualityGate` nem do `PublicationDecisionEngine`. |
| Nunca publicar página sem valor real ("temos um ASIN" não basta) | `PublicationDecisionEngine` (`lib/services/publication-decision.ts`) exige `hasRealData` + `canAddRealValue` antes de `CREATE`. |
| Conteúdo em escala/duplicado é bloqueado | `ContentQualityGate.duplicationRisk`, calculado via similaridade de shingles (`lib/services/similarity.ts`) contra o conteúdo já publicado do mesmo tipo. |
| Job locking / execução concorrente | `runJob()` (`lib/jobs/automation-run.ts`) bloqueia uma segunda execução do mesmo job e recupera locks travados (crash) após 60 minutos. |

## Pendências que exigem confirmação humana (não automatizáveis)

Estes itens **não podem** ser verificados por código e precisam ser confirmados manualmente antes
de `AMAZON_PROVIDER=live` em produção. Espelhados em `lib/amazon/readiness-checks.ts` e
`npm run production:readiness` — nenhum deles vira PASS sozinho, só quando um humano de fato
confirma com a Amazon e ajusta o `.env` correspondente.

**BR:**
- [x] Tracking ID próprio do PreçoCaindo criado sob a conta PETMOL — `precocaindo-20` ✅
- [ ] Conta aprovada para a Creators API (`AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED`) — a própria
      página da Amazon mostra esse item como não cumprido hoje
- [ ] Volume de vendas qualificadas da conta atinge o mínimo exigido (10 vendas qualificadas nos
      últimos 30 dias, segundo o FAQ oficial) — **nunca inferir isso de cliques/pedidos do painel
      de afiliados**; só a confirmação da própria Amazon conta (`AMAZON_BR_QUALIFIED_SALES_MET`)
- [ ] Acesso confirmado à Creators API (não a PA-API legada), incluindo confirmação de que as
      credenciais não retornam `AssociateNotEligible` após o prazo de até 48h

**US:**
- [ ] `precocaindo.com.br` cadastrado na conta US (`AMAZON_US_PRECOCAINDO_REGISTERED`)
- [ ] Situação da conta US validada (revisão inicial concluída, `AMAZON_US_ENABLED` só vira
      `true` depois disso)
- [ ] Configuração de pagamento/recebimento bancário resolvida (`AMAZON_US_PAYMENT_CONFIGURED`)
- [ ] Política/compliance específica dos EUA revisada antes de qualquer ativação

**Ambos:**
- [ ] Licença de uso de imagens/conteúdo do programa revisada para o caso de uso atual
- [ ] Revisão jurídica da política de comissão vigente (não exibimos comissão estimada
      publicamente até essa confirmação — seção 68 do briefing original)
- [ ] Confirmação de que tráfego pago (`PAID_MEDIA`) continua fora de escopo até nova revisão —
      a flag permanece `DISABLED`

## Proibição de autocompra

Compras feitas pelo próprio proprietário, funcionários, ou destinadas artificialmente a
beneficiar o associado não devem ser usadas para gerar comissão. Isso não é (e não pode ser)
imposto por código — é uma regra operacional que fica registrada aqui.

## Checklist automatizado

```bash
npm run amazon:compliance
npm run production:readiness
```

`amazon:compliance` roda `checkLiveActivationReadiness("BR")` (`lib/amazon/policy-guard.ts`) e
retorna PASS/FAIL — escopado a BR, o único marketplace com atividade de conta real hoje.
`production:readiness` (docs/PRODUCTION_READINESS.md) cobre um escopo mais amplo e explicitamente
BR **e** US (banco, migrations, testes, SEO, segurança do admin, domínio, e os itens de conta
listados acima). Nenhum dos dois substitui a lista de pendências acima, que continua exigindo
confirmação humana.
