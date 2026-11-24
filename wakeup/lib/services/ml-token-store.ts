import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { MercadoLivreProvider } from "@/lib/providers/mercado-livre-provider";

/**
 * Automatic Mercado Livre OAuth token refresh (project brief, 2026-09-07 —
 * "requisito operacional importante"). Supersedes the manual
 * scripts/ml-refresh-token.ts for routine use (kept as a manual
 * bootstrap/recovery tool — see its own doc comment).
 *
 * WHY THIS NEEDS DB PERSISTENCE, NOT JUST ENV: `MERCADO_LIVRE_ACCESS_TOKEN`
 * lives in `.env`, read once into `process.env` at container start
 * (lib/config/env.ts's `env` object is built once, at import time). A
 * refresh that only computed a new token and "set" it somewhere in the
 * running process would never actually change what `env.ts` already
 * captured — the next request would still see the stale value. Mutating
 * `process.env` at runtime doesn't fix this either (nothing re-reads it).
 * The token has to live somewhere every request can see fresh: this
 * project's own Postgres, already the source of truth for everything else
 * — `IntegrationCredential`, one row per provider (see prisma/schema.prisma
 * for why it's not encrypted at rest: same trust boundary as this database
 * already has for every other value).
 *
 * Refreshes are triggered lazily on read (`getValidMercadoLivreAccessToken`),
 * not on a timer — no new cron, matching the project brief's "não crie cron
 * paralelo se não for necessário". Any caller (a script, an API route, a
 * future job step) that needs a working token calls this and always gets
 * one that's valid for at least REFRESH_MARGIN_MS longer.
 *
 * Concurrency: an in-process promise dedupes concurrent refreshes within
 * one Node process (the common case — this app runs as a single container,
 * no horizontal scaling today). Cross-process safety (in case that ever
 * changes) comes from the DB update itself being conditioned on the
 * accessToken this process last read: if another process refreshed first,
 * this process's `updateMany` matches zero rows and it just re-reads the
 * winning row instead of clobbering it or double-spending the (single-use,
 * rotating) refresh_token.
 *
 * Never logs accessToken/refreshToken/client_secret — same discipline as
 * scripts/ml-refresh-token.ts.
 */

const REFRESH_MARGIN_MS = 10 * 60 * 1000; // refresh once inside the last 10 minutes of validity

let refreshInFlight: Promise<string> | null = null;

export async function getValidMercadoLivreAccessToken(): Promise<string> {
  const credential = await getOrBootstrapCredential();

  if (credential.expiresAt.getTime() - Date.now() > REFRESH_MARGIN_MS) {
    return credential.accessToken;
  }

  // Dedupe concurrent refreshes within this process — several callers
  // hitting an about-to-expire token at once must not each spend the
  // single-use refresh_token.
  if (!refreshInFlight) {
    refreshInFlight = refresh(credential.accessToken, credential.refreshToken).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** For code that wants a ready-to-use provider rather than a bare token
 * string — the recommended entry point for any new, long-running caller
 * (radar detection, future job steps). Existing callers using
 * `new MercadoLivreProvider()` (reads the static env token) are
 * unaffected. */
export async function createMercadoLivreProvider(): Promise<MercadoLivreProvider> {
  const token = await getValidMercadoLivreAccessToken();
  return new MercadoLivreProvider(token);
}

async function getOrBootstrapCredential() {
  const existing = await prisma.integrationCredential.findUnique({
    where: { provider: "MERCADO_LIVRE" },
  });
  if (existing) return existing;

  if (!env.MERCADO_LIVRE_ACCESS_TOKEN || !env.MERCADO_LIVRE_REFRESH_TOKEN) {
    throw new Error(
      "No IntegrationCredential row for MERCADO_LIVRE and no MERCADO_LIVRE_ACCESS_TOKEN/" +
        "REFRESH_TOKEN in .env to bootstrap from — complete the OAuth flow first " +
        "(scripts/ml-refresh-token.ts's doc comment, docs/MONETIZATION_SCORE.md).",
    );
  }

  // Bootstrapped from .env exactly once. This process has no way to know
  // the real remaining lifetime of a token issued outside of it — but
  // treating it as "already expired" is its own real bug (found live,
  // 2026-09-07): it forces an immediate refresh on the very first call,
  // which fails loudly if MERCADO_LIVRE_CLIENT_ID/SECRET aren't
  // configured yet, even though the existing access token is still
  // perfectly valid. So: actually check, with one cheap real call
  // (GET /users/me — confirmed working, unauthenticated-safe endpoint),
  // rather than guessing either direction.
  const probe = await fetch("https://api.mercadolibre.com/users/me", {
    headers: { Authorization: `Bearer ${env.MERCADO_LIVRE_ACCESS_TOKEN}` },
  });
  if (!probe.ok) {
    throw new Error(
      `The env-sourced MERCADO_LIVRE_ACCESS_TOKEN is no longer valid (HTTP ${probe.status}) and ` +
        "there's no IntegrationCredential row to fall back to — a human needs to redo the OAuth " +
        "flow (docs/MONETIZATION_SCORE.md).",
    );
  }
  // Confirmed valid right now; ML's real grant lifetime is ~6h
  // (confirmed live, this project's own OAuth testing) — used as the
  // bootstrap estimate since the token's own issuance time is unknown to
  // this process. The next refresh (10 minutes before this estimate
  // expires) gets ML's own real expires_in from then on, no more
  // estimating.
  return prisma.integrationCredential.create({
    data: {
      provider: "MERCADO_LIVRE",
      accessToken: env.MERCADO_LIVRE_ACCESS_TOKEN,
      refreshToken: env.MERCADO_LIVRE_REFRESH_TOKEN,
      expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000),
    },
  });
}

async function refresh(previousAccessToken: string, refreshToken: string): Promise<string> {
  if (!env.MERCADO_LIVRE_CLIENT_ID || !env.MERCADO_LIVRE_CLIENT_SECRET) {
    throw new Error(
      "MERCADO_LIVRE_CLIENT_ID/MERCADO_LIVRE_CLIENT_SECRET must be set to refresh the access token.",
    );
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: env.MERCADO_LIVRE_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    // Never logs the response body — Mercado Livre's token-exchange error
    // payloads can echo back request parameters.
    logger.error("mercado_livre.token_refresh_failed", { status: response.status });
    throw new Error(
      `Mercado Livre token refresh failed: HTTP ${response.status}. The refresh_token may be ` +
        "invalid/expired — a human needs to redo the OAuth flow (see docs/MONETIZATION_SCORE.md).",
    );
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const expiresAt = new Date(Date.now() + body.expires_in * 1000);

  // Optimistic concurrency: only the process that still sees the token
  // this refresh was based on gets to apply the result. Mercado Livre
  // rotates refresh_token on every use — a lost race here would mean two
  // processes both trying to spend the same now-invalidated
  // refresh_token, so this must never silently overwrite a newer row.
  const result = await prisma.integrationCredential.updateMany({
    where: { provider: "MERCADO_LIVRE", accessToken: previousAccessToken },
    data: { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt },
  });

  if (result.count === 0) {
    // Another process/call already refreshed (or bootstrapped) since this
    // one read the row — use whatever is current now instead of retrying
    // the network call (which would burn the already-rotated
    // refresh_token again).
    const current = await prisma.integrationCredential.findUniqueOrThrow({
      where: { provider: "MERCADO_LIVRE" },
    });
    logger.info("mercado_livre.token_refresh_lost_race", {});
    return current.accessToken;
  }

  logger.info("mercado_livre.token_refreshed", { expiresAt: expiresAt.toISOString() });
  return body.access_token;
}

export interface MercadoLivreCredentialStatus {
  connected: boolean;
  expiresAt: Date | null;
  updatedAt: Date | null;
}

/** For /admin display only — never returns the token values themselves. */
export async function getMercadoLivreCredentialStatus(): Promise<MercadoLivreCredentialStatus> {
  const row = await prisma.integrationCredential.findUnique({ where: { provider: "MERCADO_LIVRE" } });
  if (!row) return { connected: false, expiresAt: null, updatedAt: null };
  return { connected: true, expiresAt: row.expiresAt, updatedAt: row.updatedAt };
}
