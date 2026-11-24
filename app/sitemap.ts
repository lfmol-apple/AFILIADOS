import type { MetadataRoute } from "next";

// Owner's decision, 2026-11-24 ("site público inteiro adormece"): the
// organic public price-comparison site (home, /produto, /ofertas,
// category/content pages, guides) was deleted outright — not gated, gone
// — in favor of the Vitrine Inteligente campaign engine as the project's
// sole active focus. Nothing left here is meant to be indexed (see
// app/robots.ts), so there is nothing left to list. See git tag
// archive/preco-caindo-organico-2026-11-24 for the full pre-pivot site
// (including this file's previous, much larger version) if it's ever
// woken back up.
export default function sitemap(): MetadataRoute.Sitemap {
  return [];
}
