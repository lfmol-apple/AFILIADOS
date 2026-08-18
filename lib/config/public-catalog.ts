import { env } from "./env";
import type { DataSource } from "@prisma/client";

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

/**
 * A narrower, always-achievable safety bar than isPublicCatalogSafeToShow():
 * "is fabricated data NOT being exposed publicly right now" — true whenever
 * the catalog isn't being shown at all (PUBLIC_CATALOG_ENABLED=false, the
 * default), or when it's being shown with real (non-mock) data. Only false
 * for the one genuinely dangerous combination: production, a mock
 * provider, and the catalog flag actually turned on.
 *
 * This is what SITE_LAUNCH_READY checks (lib/readiness/report.ts) — an
 * institutional pre-launch site with the catalog hidden must be able to go
 * live without waiting for PUBLIC_CATALOG_SAFE, which is a much higher bar
 * (CATALOG_LAUNCH_READY) about whether the catalog itself is ready to show,
 * not just whether it's safely hidden.
 */
export function isMockDataPubliclyHidden(): boolean {
  const catalogWouldBeVisible = env.PUBLIC_CATALOG_ENABLED;
  const isMock = env.AMAZON_PROVIDER === "mock";
  const isProduction = process.env.NODE_ENV === "production";
  return !(isProduction && isMock && catalogWouldBeVisible);
}

/**
 * Per-marketplace-data-origin visibility (project brief Sprint 6, section
 * 12 — "evolua o modelo para distinguir origem dos dados"). This is the
 * ONLY place that decides whether a given Product.dataSource may appear
 * on a public page — every public query and every product-page loader
 * must go through this, never re-derive the rule inline.
 *
 * Two gates stay conceptually separate but MANUAL_VERIFIED needs BOTH:
 *
 *   PUBLIC_CATALOG_ENABLED=false                          → nothing public
 *   PUBLIC_CATALOG_ENABLED=true, MANUAL_PRODUCTS_ENABLED=false → MANUAL_VERIFIED hidden
 *   PUBLIC_CATALOG_ENABLED=true, MANUAL_PRODUCTS_ENABLED=true  → MANUAL_VERIFIED eligible
 *
 * PUBLIC_CATALOG_ENABLED is the master "is the commercial catalog allowed
 * to be public at all" switch — turning it off must hide every data
 * source, including manually verified ones. MANUAL_PRODUCTS_ENABLED only
 * narrows further, it never widens past that master switch.
 *
 * - MOCK / AMAZON_API: governed by isPublicCatalogSafeToShow(), which
 *   additionally forces the catalog closed in production when
 *   AMAZON_PROVIDER=mock — unchanged from before this cohort work existed.
 * - MANUAL_VERIFIED: reads the raw env.PUBLIC_CATALOG_ENABLED flag (not
 *   isPublicCatalogSafeToShow()) because the AMAZON_PROVIDER=mock safety
 *   net exists specifically to stop provider-sourced fabricated data —
 *   it doesn't apply to hand-verified facts. But the master
 *   PUBLIC_CATALOG_ENABLED switch itself still fully applies.
 * - AMAZON_API: not implemented yet (see docs/AMAZON.md); treated the same
 *   as MOCK for now, since it would also be bulk provider-sourced data.
 */
export function isDataSourceCurrentlyVisible(dataSource: DataSource): boolean {
  if (dataSource === "MANUAL_VERIFIED") {
    return env.PUBLIC_CATALOG_ENABLED && env.MANUAL_PRODUCTS_ENABLED;
  }
  return isPublicCatalogSafeToShow(); // MOCK and AMAZON_API
}

/** The list of DataSource values a Prisma `where: { dataSource: { in: ... } }`
 * clause should currently allow — used by every bulk public query
 * (listings, sitemap) so a single array covers all rows at once instead of
 * filtering per-row in JS. Empty array is a valid, safe result (nothing
 * visible right now), never an error. */
export function currentlyVisibleDataSources(): DataSource[] {
  const sources: DataSource[] = [];
  if (isPublicCatalogSafeToShow()) sources.push("MOCK", "AMAZON_API");
  if (env.PUBLIC_CATALOG_ENABLED && env.MANUAL_PRODUCTS_ENABLED) sources.push("MANUAL_VERIFIED");
  return sources;
}
