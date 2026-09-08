import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { completeMercadoLivreOAuth } from "@/lib/services/ml-oauth";
import { ML_OAUTH_PKCE_COOKIE } from "@/app/api/admin/mercadolivre/authorize/route";
import { logger } from "@/lib/observability/logger";
import { env } from "@/lib/config/env";

/**
 * Real Mercado Livre OAuth callback — registered as this exact path in
 * the DevCenter for the "Preço Caindo" app. Validates state + PKCE,
 * exchanges the code for tokens server-side, persists via
 * lib/services/ml-oauth.ts (same IntegrationCredential row
 * lib/services/ml-token-store.ts reads), and redirects to /admin with a
 * simple ?ml_oauth=success|error indicator — never a token, never
 * rendered in any page.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const pkceCookieRaw = cookieStore.get(ML_OAUTH_PKCE_COOKIE)?.value;
  // Always cleared — this cookie is single-use regardless of outcome.
  cookieStore.delete(ML_OAUTH_PKCE_COOKIE);

  // Built from NEXT_PUBLIC_SITE_URL, never `url.origin` — behind this
  // project's nginx reverse proxy, the Node process sees its own
  // container-internal bind address (0.0.0.0:3000) as the request origin,
  // not the public host. Confirmed live (2026-09-08): using `url.origin`
  // here sent the browser to an unreachable `https://0.0.0.0:3000/admin`.
  const adminUrl = (query: string) => `${env.NEXT_PUBLIC_SITE_URL}/admin${query}`;

  const fail = (reason: string) => {
    logger.error("mercado_livre.oauth_callback_failed", { reason });
    return NextResponse.redirect(adminUrl(`?ml_oauth=error&reason=${encodeURIComponent(reason)}`));
  };

  if (oauthError) return fail(`mercado_livre_returned_error:${oauthError}`);
  if (!code || !state) return fail("missing_code_or_state");
  if (!pkceCookieRaw) return fail("missing_pkce_cookie");

  let pkce: { state: string; codeVerifier: string };
  try {
    pkce = JSON.parse(pkceCookieRaw);
  } catch {
    return fail("malformed_pkce_cookie");
  }

  if (pkce.state !== state) return fail("state_mismatch");

  try {
    await completeMercadoLivreOAuth({ code, codeVerifier: pkce.codeVerifier });
  } catch (error) {
    logger.error("mercado_livre.oauth_callback_exchange_error", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return fail("token_exchange_failed");
  }

  return NextResponse.redirect(adminUrl("?ml_oauth=success"));
}
