import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

const CATALOG_PATHS = ["/produto/", "/ofertas", "/categorias/", "/melhores/", "/comparar/"];

export default function robots(): MetadataRoute.Robots {
  const disallow = ["/admin", "/go/amazon/", "/api/"];

  // Pre-launch (or a misconfigured production+mock combo) — see
  // lib/config/public-catalog.ts. The catalog routes may still be served
  // (so a direct visit doesn't 404), but must never be crawled/indexed
  // while they could be showing fictional prices.
  if (!isPublicCatalogSafeToShow()) {
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
