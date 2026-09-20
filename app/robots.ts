import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import { listIndexableMerchantProductUrls } from "@/lib/queries/public-product";
import { isOffersPageIndexable } from "@/lib/seo/offers-indexability";

// Generated purely from Amazon-sourced data (see app/sitemap.ts's
// categoryEntries/contentEntries) — no ML/Shopee equivalent exists, so
// these stay gated on currentlyVisibleDataSources() alone.
const AMAZON_ONLY_CATALOG_PATHS = ["/categorias/", "/melhores/", "/comparar/"];

// Product pages and /ofertas have independent merchant-side gates. The
// Amazon catalog gate has no bearing on MerchantListing, so a closed
// Amazon catalog must never hide otherwise-legitimate ML/Shopee surfaces
// from crawling.
const SHARED_PRODUCT_PATH = "/produto/";
const OFFERS_PATH = "/ofertas";

// Without this, Next.js prerenders robots.txt once at build time and caches
// it indefinitely — PUBLIC_CATALOG_ENABLED/MANUAL_PRODUCTS_ENABLED are
// runtime-only env vars (never set during `next build`), so a build-time
// snapshot would permanently bake in "catalog disabled" regardless of what
// the flags are actually set to afterward. Confirmed live: flipping both
// flags and restarting the container (no rebuild) left robots.txt still
// disallowing every catalog path. force-dynamic makes this route re-read
// the flags on every request, matching how /produto/[slug] already behaves.
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const disallow = ["/admin", "/go/", "/api/"];

  // Pre-launch (or every data-source gate closed) — see
  // lib/config/public-catalog.ts. Deliberately checks "is anything at all
  // currently visible" rather than isPublicCatalogSafeToShow() alone: a
  // MANUAL_VERIFIED cohort can be visible even when that check is false
  // (e.g. AMAZON_PROVIDER=mock in production). The catalog routes may
  // still be served (so a direct visit doesn't 404), but must never be
  // crawled/indexed while nothing real is actually there.
  const amazonVisible = currentlyVisibleDataSources().length > 0;
  if (!amazonVisible) {
    disallow.push(...AMAZON_ONLY_CATALOG_PATHS);
  }

  // Real bug found and fixed 2026-09-14: currentlyVisibleDataSources() only
  // ever knew about Amazon (MOCK/AMAZON_API/MANUAL_VERIFIED) — it has no
  // concept of MerchantListing at all, so /produto/ and /ofertas stayed
  // disallowed even with real, live Mercado Livre/Shopee affiliate links
  // already generating real public pages. Ask what's actually indexable
  // instead of trusting the Amazon-only flag.
  if (!amazonVisible) {
    const [merchantUrls, offersIndexable] = await Promise.all([
      listIndexableMerchantProductUrls(),
      isOffersPageIndexable(),
    ]);
    if (merchantUrls.length === 0) disallow.push(SHARED_PRODUCT_PATH);
    if (!offersIndexable) disallow.push(OFFERS_PATH);
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
