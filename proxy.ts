import { NextResponse } from "next/server";
import { resolveSlugRedirect } from "@/lib/seo/slug-redirect";

/**
 * Applies permanent redirects registered in SlugRedirect (project brief
 * Part J) before a request reaches a page — so a moved product/content slug
 * 301s instead of 404ing. Scoped via `config.matcher` to the routes that
 * actually have publishable slugs; everything else (static assets, /api,
 * /admin, /go/) never pays this DB lookup.
 *
 * Note, 2026-11-24: /produto, /categorias, /melhores and /comparar were
 * deleted along with the rest of the organic public site (owner's
 * decision — see git tag archive/preco-caindo-organico-2026-11-24), so
 * this matcher currently has nothing left to match. Left in place rather
 * than removed: harmless (the DB lookup it gates never runs, since the
 * paths it's scoped to no longer resolve to anything), and reversible if
 * those routes are ever restored from the archive. A SITE_MODE-based
 * dormant gate that used to live here (commit 9f3c4dc) was removed in
 * this pass — once the files are actually deleted, Next's own routing
 * 404s them, so a runtime on/off switch no longer does anything a real
 * deletion doesn't already do.
 *
 * Known limitation: this queries the database on every matched request.
 * Fine at current traffic; before this sees real production load, add a
 * short-TTL in-memory cache in front of resolveSlugRedirect (see
 * docs/SEO.md).
 */
export async function proxy(request: Request) {
  const url = new URL(request.url);
  const redirect = await resolveSlugRedirect(url.pathname);

  if (redirect) {
    const destination = new URL(redirect.newPath, url.origin);
    return NextResponse.redirect(destination, redirect.statusCode);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/produto/:path*", "/categorias/:path*", "/melhores/:path*", "/comparar/:path*"],
};
