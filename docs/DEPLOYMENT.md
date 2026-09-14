# Deployment

## Estado atual

Não há deploy automático configurado para produção — o CI
(`.github/workflows/ci.yml`) roda lint/typecheck/migrations/test/compliance/
build em todo push e PR, mas **não publica nada**. Isso é intencional:
nenhum deploy automático em produção sem uma decisão explícita e separada.

Há uma VPS Hostinger provisionada para produção
(`srv1880497.hstgr.cloud`, `179.198.110.11`, Ubuntu 24.04 LTS, SSH
`root@179.198.110.11`). Credenciais e segredos desse ambiente ficam fora
do repositório; ver docs/OPERATIONS.md, seção "Production access".

Esta documentação prepara os artefatos e o procedimento necessários para
um deploy real em modo institucional/pré-lançamento (ver
docs/PRODUCTION_READINESS.md — `SITE_LAUNCH_READY`). Configuração de DNS,
execução do deploy e ativação de catálogo/jobs continuam decisões
operacionais explícitas, não automatizadas por este repo.

## Por que Docker Compose

Alvo: uma única VPS Ubuntu, tráfego baixo/médio, um administrador. Entre
"Docker Compose" e "Node + Postgres administrados separadamente" (ex.:
`systemd` + Postgres apt-instalado), Docker Compose venceu por:

- **Simplicidade**: um único `docker compose -p precocaindo -f
  docker-compose.prod.yml up -d --build` sobe app + banco + proxy HTTPS.
  Sem passos manuais de `systemd unit`, `nginx.conf`, certbot cron, etc.
  — tudo declarado em `docker-compose.prod.yml` + `Caddyfile`.
- **Custo baixo**: roda inteiro em uma VPS pequena (1-2 vCPU, 2GB RAM é
  suficiente neste estágio); nenhum serviço gerenciado pago é necessário.
- **Backup**: o Postgres já roda em volume nomeado (`precocaindo_db_data`)
  — mesmo padrão do `docker-compose.yml` de desenvolvimento. `pg_dump`
  funciona identicamente em dev e produção (docs/BACKUP.md).
- **Atualização**: `git pull && docker compose -p precocaindo -f
  docker-compose.prod.yml up -d --build app` — reconstrói só o serviço que
  mudou, sem tocar no banco.
- **Rollback**: `git checkout <commit anterior> && docker compose -p
  precocaindo -f docker-compose.prod.yml up -d --build app` — como as
  migrations deste projeto são estritamente aditivas (nunca destrutivas —
  ver docs/ARCHITECTURE.md), voltar a imagem do app sem reverter o schema
  é seguro.
- **Persistência**: volumes nomeados do Docker sobrevivem a
  `docker compose -p precocaindo down` (só `down -v` os apaga) e a
  rebuilds de imagem.

**Caddy**, não nginx+certbot, como reverse proxy: um `Caddyfile` de duas
linhas (`Caddyfile` neste repo) já emite e renova certificados Let's
Encrypt automaticamente — sem cron de renovação, sem configuração TLS
manual. Para um único domínio, é estritamente mais simples e com a mesma
robustez.

## Artefatos preparados nesta sprint

| Arquivo | Papel |
| --- | --- |
| `Dockerfile` | Build multi-stage (deps → build → runtime), usa a saída `standalone` do Next.js (`next.config.ts`), roda como usuário não-root. |
| `.dockerignore` | Evita copiar `node_modules`, `.git`, `.env` para dentro da imagem. |
| `docker-compose.prod.yml` | app + db (Postgres 16) + caddy, rede interna separada da rede exposta à internet. |
| `Caddyfile` | Proxy reverso HTTPS para `precocaindo.com.br`, certificado automático. |
| `.env.example` | Documenta as três formas do ambiente (dev/staging/production) — ver seção abaixo. |
| `scripts/backup-database.sh` | `pg_dump` + gzip + retenção — docs/BACKUP.md. |
| `docs/OPERATIONS.md` | Logs, health check, jobs, deploy de atualização, rollback. |

O `Dockerfile` foi **testado localmente** nesta sprint: `docker build` foi
executado com sucesso e a imagem resultante foi rodada contra o Postgres
de desenvolvimento real, respondendo corretamente em `/api/health`. Isso
valida a imagem — não substitui testar o stack completo (`docker compose
-p precocaindo -f docker-compose.prod.yml up`) na VPS antes do primeiro
deploy real. Trate esse teste como uma etapa operacional separada.

## Passos para o primeiro deploy real

1. Acessar a VPS Ubuntu provisionada (ver docs/OPERATIONS.md) e instalar
   Docker + Docker Compose plugin, se ainda não estiverem instalados.
2. Apontar o DNS de `precocaindo.com.br` para o IP da VPS.
3. Clonar o repositório na VPS.
4. Criar `.env` a partir de `.env.example`, seção **STAGING/PRE-LAUNCH**:
   `AMAZON_PROVIDER=mock`, `PUBLIC_CATALOG_ENABLED=false`,
   `AUTO_PUBLISH=false`, `NEXT_PUBLIC_SITE_URL=https://precocaindo.com.br`,
   `DATABASE_URL` apontando para o serviço `db` do compose (não
   `localhost`), e gerar `ADMIN_PASSWORD_HASH` com
   `npm run admin:hash-password -- 'senha-real'` (rodar isso localmente ou
   na própria VPS — nunca commitar a senha em texto puro em lugar nenhum).
5. `docker compose -p precocaindo -f docker-compose.prod.yml up -d
   --build` — **sempre com `-p precocaindo` explícito** (ver
   docs/OPERATIONS.md, seção "Docker Compose — sempre com `-p
   precocaindo`": um comando sem `-p` já criou um segundo Postgres sobre
   o mesmo volume de dados em produção).
6. Rodar as migrations: `docker compose -p precocaindo -f
   docker-compose.prod.yml exec app node node_modules/prisma/build/index.js
   migrate deploy`.
7. **Não** rodar `npm run db:seed` em produção — dados de demonstração,
   nunca confundir com catálogo real.
8. Rodar `npm run production:readiness` (localmente, apontando
   `DATABASE_URL`/`NEXT_PUBLIC_SITE_URL` para os valores reais) e revisar
   o veredito `SITE_LAUNCH_READY` — deve estar `READY` antes de considerar
   o ambiente pronto para tráfego real. `CATALOG_LAUNCH_READY` e
   `PRODUCTION` devem continuar `NOT READY` neste estágio — isso é
   esperado (ver docs/PRODUCTION_READINESS.md).
9. Configurar monitoramento externo de `/api/health` (retorna `503` quando
   `status: "unhealthy"`).
10. Agendar backups (docs/BACKUP.md) — ainda não automatizado por padrão.
11. Só depois, avaliar quando agendar os jobs de automação via cron
    (docs/OPERATIONS.md — também não ativado por padrão nesta sprint).

## Antes de ativar `PUBLIC_CATALOG_ENABLED=true`

Ver docs/PRODUCTION_READINESS.md's `CATALOG_LAUNCH_READY`. Nunca ligar em
produção enquanto `AMAZON_PROVIDER=mock` — `isPublicCatalogSafeToShow()`
(`lib/config/public-catalog.ts`) recusa essa combinação
independentemente do valor do flag.

## Antes de ativar `AMAZON_PROVIDER=live`

Ver o checklist completo em [docs/AMAZON_COMPLIANCE.md](AMAZON_COMPLIANCE.md)
e rodar `npm run amazon:compliance` — deve retornar PASS. A Creators API
**não foi implementada** nesta sprint nem em nenhuma anterior — ver
docs/AMAZON.md.

## Antes de ativar `AUTO_PUBLISH=true`

Validar manualmente uma amostra de conteúdo gerado pelo
`ContentQualityGate` como `APPROVED`. O gate é conservador por design, mas
ainda é novo — trate a primeira ativação de `AUTO_PUBLISH` como um rollout
gradual, não um interruptor geral.
