import { NextResponse } from "next/server";
import { resolveSlugRedirect } from "@/lib/seo/slug-redirect";
import { env } from "@/lib/config/env";

/**
 * Applies permanent redirects registered in SlugRedirect (project brief
 * Part J) before a request reaches a page — so a moved product/content slug
 * 301s instead of 404ing. Scoped to the routes that actually have
 * publishable slugs; everything else never pays this DB lookup (the
 * matcher below is broader only so the dormant-site gate right below can
 * run on every path — that gate is a cheap env check, not a DB call).
 *
 * Known limitation: this queries the database on every matched request.
 * Fine at current traffic; before this sees real production load, add a
 * short-TTL in-memory cache in front of resolveSlugRedirect (see
 * docs/SEO.md).
 */
const SLUG_REDIRECT_PREFIXES = ["/produto/", "/categorias/", "/melhores/", "/comparar/"];

/**
 * Owner's decision, 2026-11-24 ("site público inteiro adormece"): the
 * owner explicitly chose, after being shown the real consequence (this
 * stops the revenue the 704+ already-published affiliate links earn
 * today and kills existing Google organic traffic), to take the whole
 * public price-comparison site dormant and keep only the Vitrine
 * Inteligente campaign engine (+ admin, so the team can keep operating
 * both) alive. SITE_MODE defaults to "full" — this is a no-op until a
 * human deliberately sets SITE_MODE=vitrine_only in production.
 *
 * This is a reversible SWITCH, not a deletion: nothing under app/ was
 * removed, no data was touched. Flipping SITE_MODE back to "full" (its
 * default) undoes this instantly. The full pre-pivot project state is
 * also separately preserved at git tag
 * archive/preco-caindo-organico-2026-11-24.
 *
 * Deliberately an explicit prefix allowlist, not a clever regex — a
 * human will read and adjust this list directly as the Vitrine/admin
 * surface evolves.
 */
const ALWAYS_ALIVE_PREFIXES = [
  // Vitrine delivery: the Meta catalog feed Henrique's campaign reads,
  // and the redirect it links to.
  "/catalogo/mercado-livre.xml",
  "/go/vitrine",
  // The Vitrine's own public ad-landing page (Facebook/Instagram ->
  // this page -> "Comprar no Mercado Livre"), per app/vitrine/[slug]/page.tsx.
  "/vitrine/",
  // Admin — the team must keep operating both the Vitrine and (if later
  // woken up) the rest of the site from here.
  "/admin",
  "/api/admin",
  // Admin-triggered Mercado Livre OAuth connect/callback flow.
  "/api/auth",
  // Infra: docker-compose's own container healthcheck polls this.
  "/api/health",
  // Supporting APIs the kept-alive Vitrine ad-landing page calls.
  "/api/vitrine",
  "/api/analytics/pageview",
  "/api/consent",
  // Next.js build assets and static icons admin/vitrine pages render with.
  "/_next",
  "/favicon.ico",
  "/apple-icon.png",
  "/icon.png",
  "/manifest.webmanifest",
];

// robots.txt and sitemap.xml are left to pass through to their own route
// handlers (app/robots.ts, app/sitemap.ts), which self-gate on SITE_MODE —
// not blanket-404'd here, so they can still return a valid (empty/
// fully-disallowing) response instead of a 404 a crawler might retry.
const ROUTE_HANDLED_PREFIXES = ["/robots.txt", "/sitemap.xml"];

export async function proxy(request: Request) {
  const url = new URL(request.url);

  if (env.SITE_MODE === "vitrine_only") {
    const alwaysAlive = [...ALWAYS_ALIVE_PREFIXES, ...ROUTE_HANDLED_PREFIXES];
    const isAlive = alwaysAlive.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix));
    if (!isAlive) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (SLUG_REDIRECT_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    const redirect = await resolveSlugRedirect(url.pathname);
    if (redirect) {
      const destination = new URL(redirect.newPath, url.origin);
      return NextResponse.redirect(destination, redirect.statusCode);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
