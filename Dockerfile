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
# binary matching this exact schema) so `prisma migrate deploy` can run
# from a one-off container of this same image — see docs/DEPLOYMENT.md
# "Rodando as migrations".
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# The Prisma CLI package itself is installed fresh here, in an isolated
# throwaway directory, rather than copied piecemeal from the builder
# stage. Next's standalone tracer only traces the app's own runtime
# import graph — it never sees the CLI (a separate process, never
# imported by app code) or the CLI's own dependencies (@prisma/config
# alone pulls in effect/c12/deepmerge-ts). Hand-copying those folders
# goes stale silently on a Prisma upgrade; a real npm install resolves
# them correctly every time. @prisma/client and .prisma are explicitly
# excluded from the merge so the correctly-generated client above is
# never overwritten by a generic, ungenerated one.
RUN mkdir -p /tmp/prisma-cli \
  && cd /tmp/prisma-cli \
  && npm init -y >/dev/null \
  && npm install --no-save prisma@6.19.3 \
  && rm -rf node_modules/@prisma/client node_modules/.prisma \
  && cp -r node_modules/. /app/node_modules/ \
  && cd /app \
  && rm -rf /tmp/prisma-cli
# Invoked as `node node_modules/prisma/build/index.js migrate deploy`
# rather than `npx prisma` — this image has no node_modules/.bin
# symlinks for it.

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
