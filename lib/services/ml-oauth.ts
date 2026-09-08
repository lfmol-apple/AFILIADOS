import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * Real Mercado Livre OAuth 2.0 + PKCE (Authorization Code) — 2026-09-08.
 * Reuses lib/services/ml-token-store.ts's `IntegrationCredential` table
 * as the single source of truth for tokens (nothing new to persist
 * tokens): this file only handles the one-time human authorization step
 * that populates/refreshes that row's initial value. Once a row exists,
 * ml-token-store.ts's refresh loop takes over — this file is never
 * called again until a human needs to re-authorize from scratch (refresh
 * token permanently invalid).
 *
 * Redirect URI is fixed and must exactly match what's registered in the
 * Mercado Livre DevCenter for this app (App ID from env
 * MERCADO_LIVRE_CLIENT_ID) — see docs/MONETIZATION_SCORE.md for what to
 * do if it doesn't.
 */

export const ML_OAUTH_REDIRECT_PATH = "/api/auth/mercadolivre/callback";

export function getMercadoLivreRedirectUri(): string {
  return `${env.NEXT_PUBLIC_SITE_URL}${ML_OAUTH_REDIRECT_PATH}`;
}

export interface MercadoLivrePkceChallenge {
  state: string;
  codeVerifier: string;
  authorizationUrl: string;
}

/** Real PKCE S256 pair + anti-CSRF state — never logged (the verifier is
 * effectively a short-lived secret: whoever has it can complete this
 * app's own token exchange). */
export function buildMercadoLivreAuthorizationRequest(): MercadoLivrePkceChallenge {
  const state = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const url = new URL("https://auth.mercadolivre.com.br/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", env.MERCADO_LIVRE_CLIENT_ID);
  url.searchParams.set("redirect_uri", getMercadoLivreRedirectUri());
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);

  return { state, codeVerifier, authorizationUrl: url.toString() };
}

/**
 * Exchanges a real authorization code for tokens and persists them into
 * `IntegrationCredential` — the exact same row ml-token-store.ts's
 * `getValidMercadoLivreAccessToken()` reads. Never returns/logs the token
 * values themselves; callers get back only a boolean/void.
 */
export async function completeMercadoLivreOAuth(input: {
  code: string;
  codeVerifier: string;
}): Promise<void> {
  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: env.MERCADO_LIVRE_CLIENT_SECRET,
      code: input.code,
      redirect_uri: getMercadoLivreRedirectUri(),
      code_verifier: input.codeVerifier,
    }),
  });

  if (!response.ok) {
    // Never logs the body — Mercado Livre's token-exchange error payloads
    // can echo back request parameters (including the authorization code).
    logger.error("mercado_livre.oauth_exchange_failed", { status: response.status });
    throw new Error(`Mercado Livre OAuth token exchange failed: HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await prisma.integrationCredential.upsert({
    where: { provider: "MERCADO_LIVRE" },
    create: {
      provider: "MERCADO_LIVRE",
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
    },
    update: {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: new Date(Date.now() + body.expires_in * 1000),
    },
  });

  logger.info("mercado_livre.oauth_completed", {});
}
