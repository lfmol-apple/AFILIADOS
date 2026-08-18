import { env } from "./env";

/**
 * Single source of truth for "is it safe to show the fictional/live
 * catalog to the public internet right now" (project brief Sprint 4
 * section 12). Two independent gates, both must pass:
 *
 * 1. A human explicitly turned PUBLIC_CATALOG_ENABLED on — the default is
 *    off, so a fresh deploy is pre-launch/institutional by construction,
 *    never "accidentally live."
 * 2. Even when enabled, production can never serve AMAZON_PROVIDER=mock
 *    data — that combination would mean showing fabricated prices to real
 *    visitors, which is never allowed regardless of what a human flipped.
 *    This check exists specifically so a misconfigured production deploy
 *    fails closed instead of publishing fake offers.
 *
 * Sitemap, robots, and product/ofertas/categorias page metadata all read
 * this same function so they can never disagree with each other about
 * whether the catalog is publishable.
 */
export function isPublicCatalogSafeToShow(): boolean {
  if (!env.PUBLIC_CATALOG_ENABLED) return false;
  if (process.env.NODE_ENV === "production" && env.AMAZON_PROVIDER === "mock") return false;
  return true;
}
