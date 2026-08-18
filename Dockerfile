# Production image for precocaindo.com.br — see docs/DEPLOYMENT.md.
# Multi-stage build so the final image ships only the traced runtime
# dependencies (Next.js "standalone" output), not the full node_modules
# or source tree.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Placeholder DATABASE_URL: `next build` needs env.ts (Zod) to parse
# successfully and `prisma generate` needs a syntactically valid URL, but
# neither talks to a real database at build time. The real DATABASE_URL is
# supplied at container runtime via docker-compose.prod.yml's env_file.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Migrations + the generated Prisma client (with its native query engine
# binary) + the Prisma CLI package itself, so migrations can run from a
# one-off container of this same image without a separate build target —
# see docs/DEPLOYMENT.md "Rodando as migrations". Invoked as
# `node node_modules/prisma/build/index.js migrate deploy` rather than
# `npx prisma` — this image has no node_modules/.bin symlinks, since the
# Next.js standalone tracer only copies traced production dependencies.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
