import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";

const CATALOG_PATHS = ["/produto/", "/ofertas", "/categorias/", "/melhores/", "/comparar/"];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/go/amazon/", "/api/"];

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
