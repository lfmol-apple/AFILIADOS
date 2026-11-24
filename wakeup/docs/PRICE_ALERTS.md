# Alertas de preço

O schema já possuía `PriceAlert`; a V1 adiciona a superfície pública sem
exigir conta do usuário.

## Fluxo implementado

1. O visitante informa e-mail e preço-alvo na página do produto.
2. `POST /api/price-alerts` valida e-mail, preço e produto.
3. O alerta é criado com `confirmationToken`, `confirmedAt=null` e
   `contactHash`.
4. `GET /api/price-alerts/confirm/[token]` confirma o alerta e consome o token.

Alertas duplicados ativos para o mesmo produto, e-mail e preço-alvo retornam o
alerta existente, evitando repetição desnecessária.

## Gate de envio

`PRICE_ALERTS=false` mantém a criação pública desligada. Isso é intencional:
sem provedor de e-mail real, não é possível concluir double opt-in de forma
responsável.

`lib/email/provider.ts` define a interface `EmailProvider` e um provider
desabilitado. O próximo passo para ativar alertas é implementar um provider real
de e-mail transacional e só então ligar `PRICE_ALERTS=true`.

## Privacidade

O e-mail é usado apenas para o alerta solicitado. `PriceAlert.contactHash` ajuda
a detectar duplicidade sem depender de comparação rotineira de texto puro. A
criação de alerta não concede consentimento de marketing.
