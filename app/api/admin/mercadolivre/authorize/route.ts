import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, isAdminRequestAuthorized } from "@/lib/admin/auth";
import { buildMercadoLivreAuthorizationRequest } from "@/lib/services/ml-oauth";

export const ML_OAUTH_PKCE_COOKIE = "ml_oauth_pkce";
const PKCE_COOKIE_TTL_MS = 10 * 60 * 1000; // 10 minutes — a human authorizing in a browser tab

/**
 * Admin-only: starts the real Mercado Livre OAuth flow. Never reachable by
 * an unauthenticated visitor — only /admin can trigger this app's own
 * OAuth exchange.
 */
export async function GET() {
  const cookieStore = await cookies();
  const authorized = await isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  if (!authorized) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const { state, codeVerifier, authorizationUrl } = buildMercadoLivreAuthorizationRequest();

  const response = NextResponse.redirect(authorizationUrl);
  // HttpOnly + short-lived — the callback route reads this to validate
  // `state` and complete PKCE. Never readable from client JS, never
  // logged.
  response.cookies.set(ML_OAUTH_PKCE_COOKIE, JSON.stringify({ state, codeVerifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // must survive the top-level redirect back from mercadolivre.com
    path: "/",
    maxAge: PKCE_COOKIE_TTL_MS / 1000,
  });
  return response;
}
