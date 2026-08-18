# PreçoCaindo

> Descubra o que comprar e a hora certa de comprar.

PreçoCaindo é uma plataforma brasileira de inteligência de compra. Ela compara o preço atual de
um produto ao seu próprio histórico coletado — não apenas ao preço de tabela — e traduz isso em
um Score explicável (0-100) que responde: *vale a pena comprar agora?*

Hoje o único marketplace suportado é a Amazon Brasil, via Programa de Associados. A arquitetura
foi desenhada para acrescentar outros marketplaces sem reescrever o núcleo (veja
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

O objetivo do produto é ficar disponível em **https://precocaindo.com.br**.

## Documentação

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — camadas, modelo de dados, decisões de design
- [docs/AUTOMATION.md](docs/AUTOMATION.md) — os 13 jobs do ciclo de automação, priorização, locking
- [docs/DEMAND_ENGINE.md](docs/DEMAND_ENGINE.md) — como a demanda real (nunca inventada) decide o que publicar
- [docs/SEO.md](docs/SEO.md) — metadata, sitemap, structured data, controle de qualidade, redirects
- [docs/CONTENT_ENGINE.md](docs/CONTENT_ENGINE.md) — geração de conteúdo, regra de zero alucinação
- [docs/ANALYTICS.md](docs/ANALYTICS.md) — o que é medido, o que nunca é coletado
- [docs/PRIVACY.md](docs/PRIVACY.md) — consentimento LGPD, o que cada categoria controla
- [docs/REMARKETING.md](docs/REMARKETING.md) — status (arquitetura pronta, nada ativo)
- [docs/AMAZON.md](docs/AMAZON.md) — status da integração Amazon (mock vs. live), contexto PETMOL
- [docs/AMAZON_COMPLIANCE.md](docs/AMAZON_COMPLIANCE.md) — checklist de conformidade com o Programa de Associados
- [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) — `npm run production:readiness`
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — como rodar em produção (VPS + Docker Compose + Caddy)
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — logs, health check, jobs, deploy de atualização, rollback
- [docs/BACKUP.md](docs/BACKUP.md) — backup e restauração do Postgres

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript strict · PostgreSQL · Prisma · Tailwind CSS 4 ·
Zod · Vitest · Docker Compose · GitHub Actions.

## Rodando localmente

### 1. Pré-requisitos

- Node.js 20.9+ (o projeto foi desenvolvido e testado em Node 22/23)
- Docker (para o PostgreSQL local)

### 2. Instalar dependências

```bash
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

O padrão já funciona para desenvolvimento local: `AMAZON_PROVIDER=mock` (nenhuma chamada externa
real à Amazon), `CONTENT_GENERATION=mock` (geração de conteúdo determinística, sem LLM externo) e
`AUTO_PUBLISH=false`. Veja todas as variáveis comentadas em [.env.example](.env.example).

### 4. Subir o banco de dados

```bash
docker compose up -d db
```

Isso sobe um Postgres 16 na porta **5433** do host (não 5432 — veja o comentário no
`docker-compose.yml` caso você já tenha um Postgres local rodando na porta padrão).

### 5. Rodar as migrations e o seed

```bash
npm run db:migrate
npm run db:seed
```

O seed cria ~10 produtos de demonstração **claramente fictícios** (nunca use esses dados como se
fossem preços reais), com categorias, históricos e scores variados — incluindo um produto com
histórico insuficiente para mostrar o estado "Ainda estamos acompanhando este preço."

### 6. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### 7. Rodar as automações manualmente (opcional)

```bash
npm run jobs:run                        # roda o ciclo completo, na ordem
npm run jobs:run CALCULATE_OPPORTUNITIES  # roda um job específico
```

Veja a lista completa de jobs em [docs/AUTOMATION.md](docs/AUTOMATION.md).

## Rotas principais

| Rota | Descrição |
| --- | --- |
| `/` | Home — preços caindo, boas compras, categorias, guias |
| `/produto/[slug]` | Ficha de produto com histórico, Score e CTA para a Amazon |
| `/ofertas` | Listagem de oportunidades, com busca |
| `/categorias/[slug]` | Produtos por categoria |
| `/melhores/[slug]` | Conteúdo editorial "melhores produtos" (gerado + validado) |
| `/comparar/[slug]` | Comparação entre produtos (gerado + validado) |
| `/transparencia` | Como ganhamos dinheiro e como calculamos o Score |
| `/go/amazon/[asin]` | Redirecionamento afiliado controlado (rastreado, sem redirect automático) |
| `/admin` | Dashboard interno — login por sessão (cookie HttpOnly), ver docs/PRODUCTION_READINESS.md "Admin security" |
| `/api/admin/login` | `POST` — autentica com a senha configurada (`ADMIN_PASSWORD_HASH`), define o cookie de sessão |
| `/api/admin/logout` | `POST` — encerra a sessão |
| `/api/health` | Health check (banco, migrations, automação, modo do provider) — nunca expõe secrets |
| `/api/consent` | Persistência do consentimento LGPD (`GET`/`POST`) |
| `/api/analytics/pageview` | Recebe pageviews first-party, só quando o visitante consentiu com Analytics |

## Qualidade e testes

```bash
npm run lint         # ESLint (flat config)
npm run typecheck     # tsc --noEmit
npm test              # Vitest
npm run amazon:compliance   # checklist de compliance Amazon (obrigatório antes de AMAZON_PROVIDER=live)
npm run production:readiness  # relatório PASS/FAIL/PENDING sobre prontidão para produção (3 vereditos)
npm run build          # build de produção (Turbopack)
npm run admin:hash-password -- 'senha'  # gera ADMIN_PASSWORD_HASH (nunca a senha em texto puro)
npm run db:backup      # pg_dump + gzip + retenção — docs/BACKUP.md
```

Todos (exceto `production:readiness`, que é esperado ficar `NOT READY` por enquanto — ver
docs/PRODUCTION_READINESS.md) rodam no CI (`.github/workflows/ci.yml`) a cada push/PR.

## Segurança e privacidade

- Nenhuma credencial é enviada ao browser; segredos só existem em variáveis de ambiente
  server-side.
- `/admin` usa autenticação por sessão (senha com hash scrypt, cookie `HttpOnly`/`Secure`/
  `SameSite=Lax`, rate limiting de tentativas de login por IP) — ver
  [docs/PRODUCTION_READINESS.md](docs/PRODUCTION_READINESS.md) "Admin security" e `lib/admin/auth.ts`.
- `/go/amazon/[asin]` nunca aceita um destino arbitrário via query string — o host é validado
  contra uma allowlist (`lib/amazon/policy-guard.ts`).
- `AffiliateClick`, `PageView` e `SearchEvent` não armazenam endereço IP. Tentativas de login
  admin armazenam só um hash do IP, nunca o endereço em texto puro.
- Log estruturado (`lib/observability/logger.ts`) redige automaticamente qualquer campo com
  nome de senha/token/cookie/secret antes de escrever a linha — ver [docs/OPERATIONS.md](docs/OPERATIONS.md).
- Banner de consentimento LGPD com três opções igualmente proeminentes (Aceitar / Recusar
  não essenciais / Configurar) — ver [docs/PRIVACY.md](docs/PRIVACY.md).
- Veja [docs/AMAZON_COMPLIANCE.md](docs/AMAZON_COMPLIANCE.md) para o checklist completo.

## Amazon: mock hoje, live quando configurado

A integração real com a Amazon (Creators API) **não está implementada** — ver
[docs/AMAZON.md](docs/AMAZON.md) para o que falta. O `AmazonProvider` real falha alto e claro se
chamado sem credenciais; não existe fallback de scraping em nenhuma camada.

## IA / geração de conteúdo

Por padrão, `CONTENT_GENERATION=mock` usa um gerador determinístico baseado em template
(`MockContentProvider`) que só usa fatos explicitamente fornecidos — nunca inventa especificação,
avaliação, desconto ou preço anterior. Providers reais (`OpenAIContentProvider`,
`AnthropicContentProvider`) existem como esqueleto e recusam-se a rodar sem uma API key real
configurada. Veja [docs/CONTENT_ENGINE.md](docs/CONTENT_ENGINE.md).
