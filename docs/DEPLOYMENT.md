# Deployment

## Estado atual

Não há deploy automático configurado para produção — o CI (`.github/workflows/ci.yml`) roda
lint/typecheck/test/compliance/build em todo push e PR, mas **não publica nada**. Isso é
intencional (seção 30 do briefing): nenhum deploy automático em produção nesta primeira etapa sem
configuração explícita.

## Requisitos de ambiente

- Node.js 20.9+
- PostgreSQL 16 acessível via `DATABASE_URL`
- Variáveis de ambiente de produção definidas a partir de `.env.example` — nunca commitadas

## Passos para o primeiro deploy manual

1. Provisionar um PostgreSQL gerenciado (ou um container Postgres 16 com volume persistente).
2. Definir as variáveis de ambiente de produção (ver `.env.example`). Mantenha
   `AMAZON_PROVIDER=mock` e `AUTO_PUBLISH=false` até validar a integração real e a qualidade do
   conteúdo gerado.
3. Rodar as migrations: `npm run db:deploy` (usa `prisma migrate deploy`, seguro para produção —
   não gera migrations novas, só aplica as existentes).
4. **Não** rodar `npm run db:seed` em produção — o seed é dados de demonstração e o script se
   recusa a rodar se `DATABASE_URL` parecer um ambiente de produção
   (`precocaindo.com.br|prod|production`), mas a checagem é uma rede de segurança, não uma
   garantia — confira manualmente antes de rodar qualquer coisa contra o banco de produção.
5. Build: `npm run build`.
6. Start: `npm run start`.
7. Agendar os jobs de automação (`docs/AUTOMATION.md`) via GitHub Actions `schedule:`, crontab, ou
   equivalente — eles não rodam sozinhos.
8. Rodar `npm run production:readiness` (docs/PRODUCTION_READINESS.md) e revisar os bloqueadores
   listados antes de considerar o ambiente pronto para tráfego real.
9. Configurar monitoramento externo de `/api/health` (retorna `503` quando `status: "unhealthy"`)
   se a plataforma de hospedagem suportar health checks HTTP.

Nesta sprint, **nenhum deploy foi realizado** — nem VPS, nem DNS, nem `precocaindo.com.br`. Essa
etapa é explicitamente uma sprint futura, autorizada separadamente.

## Antes de ativar `AMAZON_PROVIDER=live`

Ver o checklist completo em [docs/AMAZON_COMPLIANCE.md](AMAZON_COMPLIANCE.md) e rodar
`npm run amazon:compliance` — deve retornar PASS.

## Antes de ativar `AUTO_PUBLISH=true`

Validar manualmente uma amostra de conteúdo gerado pelo `ContentQualityGate` como `APPROVED`. O
gate é conservador por design, mas ainda é novo — trate a primeira ativação de `AUTO_PUBLISH`
como um rollout gradual, não um interruptor geral.
