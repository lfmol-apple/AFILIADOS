import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";

const CATALOG_PATHS = [
  "/produto/",
  "/ofertas",
  "/categorias/",
  "/melhores/",
  "/comparar/",
];

// Without this, Next.js prerenders robots.txt once at build time and caches
// it indefinitely — PUBLIC_CATALOG_ENABLED/MANUAL_PRODUCTS_ENABLED are
// runtime-only env vars (never set during `next build`), so a build-time
// snapshot would permanently bake in "catalog disabled" regardless of what
// the flags are actually set to afterward. Confirmed live: flipping both
// flags and restarting the container (no rebuild) left robots.txt still
// disallowing every catalog path. force-dynamic makes this route re-read
// the flags on every request, matching how /produto/[slug] already behaves.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/go/", "/api/"];

  // Pre-launch (or every data-source gate closed) — see
  // lib/config/public-catalog.ts. Deliberately checks "is anything at all
  // currently visible" rather than isPublicCatalogSafeToShow() alone: a
  // MANUAL_VERIFIED cohort can be visible even when that check is false
  // (e.g. AMAZON_PROVIDER=mock in production). The catalog routes may
  // still be served (so a direct visit doesn't 404), but must never be
  // crawled/indexed while nothing real is actually there.
  if (currentlyVisibleDataSources().length === 0) {
    disallow.push(...CATALOG_PATHS);
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
