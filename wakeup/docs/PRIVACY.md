# Privacidade e LGPD — notas de engenharia

Este documento descreve, em termos factuais, o que o código faz. Não é uma peça jurídica e não
declara conformidade legal absoluta — decisões finais de conformidade cabem a uma revisão
jurídica, não a este arquivo.

## Categorias de consentimento

`prisma/schema.prisma` → `ConsentRecord` guarda duas escolhas por `subjectId` pseudônimo:

- **ANALYTICS** — controla se `components/analytics-beacon.tsx` envia `PageView` (ver
  docs/ANALYTICS.md).
- **MARKETING** — reservado para uso futuro (remarketing, e-mail); nada no sistema usa esse valor
  ainda, porque não existe nenhum canal de marketing ativo (ver docs/REMARKETING.md).

Não existe uma escolha "ESSENTIAL" porque não é uma escolha — é o mínimo necessário para o site
funcionar (ex.: o próprio registro de consentimento), e nunca fica atrás do banner.

## Onde o consentimento é coletado

`components/consent-banner.tsx`, renderizado em todas as páginas via `app/layout.tsx`. Três ações,
todas do mesmo tamanho e mesma proeminência visual — nenhum dark pattern onde "Aceitar" é um botão
grande e "Recusar" é um link pequeno:

- **Aceitar** — concede ANALYTICS e MARKETING.
- **Recusar não essenciais** — nega ambos.
- **Configurar** — permite escolher cada categoria individualmente.

A escolha é persistida em dois lugares: um cookie de primeira parte no navegador
(`lib/privacy/consent-client.ts`, para leitura imediata sem round-trip) e no banco via
`POST /api/consent` (`lib/privacy/consent.ts`), para existir um registro do consentimento que não
depende só do navegador do usuário.

## O que é coletado, e por quê

| Dado | Onde | Por quê | Gate de consentimento |
| --- | --- | --- | --- |
| `PageView` (página, UTM, domínio do referrer, sessão pseudônima) | `PageView` | Entender o que funciona no site | ANALYTICS |
| `SearchEvent` (busca interna) | `SearchEvent` | Alimentar o Demand Engine, detectar lacunas de catálogo | Nenhum — ver justificativa em docs/ANALYTICS.md |
| `AffiliateClick` | `AffiliateClick` | Métrica central do negócio (cliques enviados à Amazon) | Nenhum — dado transacional, não comportamental |
| Contato para alerta de preço | `PriceAlert.contact` | Enviar o alerta que o usuário pediu | Consentimento explícito no momento da criação; nunca implica MARKETING |

Nunca armazenamos endereço IP em nenhuma dessas tabelas. Nunca fazemos fingerprinting.

## Revogação

Qualquer escolha pode ser trocada a qualquer momento reabrindo as preferências (o banner some após
a primeira escolha, mas a lógica de leitura/gravação em `lib/privacy/consent-client.ts` já suporta
uma futura tela de preferências que reabre o mesmo fluxo). Um alerta de preço pode ser cancelado
via `cancelPriceAlert()` (`lib/services/price-alert.ts`).

## Alertas de preço não equivalem a marketing

Criar um alerta de preço (`createPriceAlert()`) nunca grava ou altera `ConsentRecord.marketing` —
são conceitos deliberadamente independentes no código, não apenas na intenção (project brief Part
N). Um teste (`tests/price-alert.test.ts`) verifica isso explicitamente.
