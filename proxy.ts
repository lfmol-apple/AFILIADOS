import { NextResponse } from "next/server";
import { resolveSlugRedirect } from "@/lib/seo/slug-redirect";

/**
 * Applies permanent redirects registered in SlugRedirect (project brief
 * Part J) before a request reaches a page — so a moved product/content slug
 * 301s instead of 404ing. Scoped via `config.matcher` to the routes that
 * actually have publishable slugs; everything else (static assets, /api,
 * /admin, /go/) never pays this DB lookup.
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
