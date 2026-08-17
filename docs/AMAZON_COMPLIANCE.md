# Compliance — Programa de Associados Amazon Brasil

**Última revisão manual deste documento:** 2026-08-17 (`AMAZON_POLICY_REVIEW_DATE` no `.env`).
O `/admin` mostra um aviso quando essa data está a mais de 90 dias no passado. Atualize a
variável de ambiente *e* esta data sempre que revisar as políticas oficiais.

Documentos oficiais a revisar periodicamente (não versionados aqui — sempre consultar a fonte
vigente no momento da revisão):

- Contrato Operacional do Programa de Associados Amazon Brasil
- Políticas do Programa de Associados
- Regulamento de Comissões vigente
- Termos/licença da Creators API

Este arquivo é o checklist de engenharia — não substitui uma revisão jurídica.

## Onde cada regra vira código

| Regra | Onde é aplicada |
| --- | --- |
| Nunca redirecionar automaticamente para a Amazon | `/go/amazon/[asin]` só existe como destino de um `<Link>` real; não há nenhum `redirect()` disparado no carregamento de página em nenhuma rota pública. |
| Nunca aceitar destino arbitrário no redirect | `resolveAffiliateRedirect()` (`lib/services/affiliate-redirect.ts`) ignora completamente a query string como fonte de destino; o destino vem só do banco (`Offer.affiliateUrl`) ou é reconstruído a partir do ASIN + tag configurada. |
| Allowlist de hosts Amazon | `assertAllowedAmazonDestination()` (`lib/amazon/policy-guard.ts`) — só `amazon.com.br`/`www.amazon.com.br`/`amzn.to`, só `https:`. |
| Tag de afiliado nunca hardcoded | `AMAZON_ASSOCIATE_TAG` via env; `buildAmazonProductUrl()` recusa gerar link sem tag configurada. |
| Disclosure visível perto do link, não só no rodapé | `<AffiliateDisclosure />` é renderizado ao lado de todo `<AmazonCta />` (`components/amazon-cta.tsx`), não apenas no footer. |
| Texto de disclosure centralizado e atualizável | `AMAZON_ASSOCIATE_DISCLOSURE` no `.env`, lido por `lib/amazon/policy-guard.ts` → `lib/amazon/disclosure.ts`. |
| PreçoCaindo nunca alega vender o produto | CTAs dizem "Ver preço na Amazon" / "Ver oferta na Amazon", nunca "Comprar agora no PreçoCaindo". O JSON-LD `Product.offers.seller` na página de produto é sempre `"Amazon.com.br"`. |
| Ranking é do PreçoCaindo, não da Amazon | Toda ocorrência do score é rotulada "Score PreçoCaindo"; a metodologia (`/metodologia`, `/transparencia`) deixa explícito que o cálculo é próprio. |
| Não fabricar histórico de preço | `calculatePriceStats()` nunca reporta `coverageDays` maior que o intervalo realmente coletado; o gráfico de histórico mostra "ainda não temos histórico suficiente" com menos de 2 pontos. |
| Sem scraping em nenhuma camada | Nenhuma dependência de scraping no `package.json`; `AmazonProvider` real lança erro em vez de ter fallback. |
| Cliques não armazenam dado pessoal desnecessário | `AffiliateClick` não tem coluna de IP. |
| `AUTO_PUBLISH` protege contra publicação descontrolada | Padrão `false`; `PUBLISH_CONTENT` nunca ignora o veredito do `ContentQualityGate`. |

## Pendências que exigem confirmação humana (não automatizáveis)

Estes itens **não podem** ser verificados por código e precisam ser confirmados manualmente antes
de `AMAZON_PROVIDER=live` em produção:

- [ ] Conta de Associado válida e em conformidade
- [ ] Domínio/site declarado na conta, quando exigido
- [ ] Acesso confirmado à Creators API (não a PA-API legada)
- [ ] Licença de uso de imagens/conteúdo do programa revisada para o caso de uso atual
- [ ] Revisão jurídica da política de comissão vigente (não exibimos comissão estimada
      publicamente até essa confirmação — seção 68 do briefing)
- [ ] Confirmação de que tráfego pago (`PAID_MEDIA`) continua fora de escopo até nova revisão —
      a flag permanece `DISABLED`

## Proibição de autocompra

Compras feitas pelo próprio proprietário, funcionários, ou destinadas artificialmente a
beneficiar o associado não devem ser usadas para gerar comissão. Isso não é (e não pode ser)
imposto por código — é uma regra operacional que fica registrada aqui.

## Checklist automatizado

```bash
npm run amazon:compliance
```

Roda `checkLiveActivationReadiness()` (`lib/amazon/policy-guard.ts`) e retorna PASS/FAIL. Cobre
apenas o que é verificável por configuração (tag, credenciais, disclosure, data de revisão) — os
itens da lista de pendências acima continuam exigindo confirmação humana.
