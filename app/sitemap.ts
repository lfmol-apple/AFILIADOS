import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/config/site";
import { isProductPageIndexable } from "@/lib/seo/indexability";
import { PRIMARY_PUBLIC_MARKETPLACE } from "@/lib/config/marketplaces";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";
import { GUIDES } from "@/lib/editorial/guides";

// force-dynamic (not just `revalidate`) because PUBLIC_CATALOG_ENABLED/
// MANUAL_PRODUCTS_ENABLED are runtime-only env vars, never set during
// `next build` — a build-time ISR snapshot always bakes in "catalog
// disabled" and would only self-correct up to an hour later. Confirmed
// live: flipping both flags and restarting the container left sitemap.xml
// showing only static routes, no products, right after the flip.
export const dynamic = "force-dynamic";

const STATIC_ROUTES = [
  "",
  "/ofertas",
  "/guias",
  "/transparencia",
  "/sobre",
  "/como-funciona",
  "/metodologia",
  "/politica-editorial",
  "/privacidade",
  "/termos",
];

/**
 * Only canonical, publishable URLs go here (project brief Part Y) — no
 * /admin, /go/, /api routes (never queried below), no GeneratedContent
 * marked noindex, and no product with too little real content to be worth
 * a crawl (same rule the product page itself uses for its robots meta tag,
 * via lib/seo/indexability.ts, so the two can't disagree).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // No currently-visible data source (pre-launch, or every gate closed —
  // see lib/config/public-catalog.ts) means the sitemap must not list a
  // single product/category/content URL: an empty sitemap with just the
  // static institutional routes is the honest state. This is NOT the same
  // check as isPublicCatalogSafeToShow() alone — a MANUAL_VERIFIED cohort
  // can be visible even when that returns false (e.g. AMAZON_PROVIDER=mock
  // in production), so we must ask what's *actually* visible, not just
  // whether the mock-provider catalog is.
  const visibleDataSources = currentlyVisibleDataSources();
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: path === "" || path === "/ofertas" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));
  const guideEntries: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${siteConfig.url}/guias/${guide.slug}`,
    lastModified: guide.updatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  if (visibleDataSources.length === 0) {
    return [...staticEntries, ...guideEntries];
  }

  const [products, categories, content] = await Promise.all([
    prisma.product.findMany({
      where: {
        marketplace: PRIMARY_PUBLIC_MARKETPLACE,
        active: true,
        dataSource: { in: visibleDataSources },
      },
      select: {
        slug: true,
        updatedAt: true,
        description: true,
        specifications: true,
        priceStats: { select: { coverageDays: true } },
      },
    }),
    // Empty categories (no currently-visible product) must not be indexed
    // — a category page with zero products is thin/useless content.
    prisma.category.findMany({
      where: {
        active: true,
        products: {
          some: {
            marketplace: PRIMARY_PUBLIC_MARKETPLACE,
            active: true,
            dataSource: { in: visibleDataSources },
          },
        },
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.generatedContent.findMany({
      where: { status: "PUBLISHED", noindex: false },
      select: { contentType: true, slug: true, updatedAt: true },
    }),
  ]);

  const productEntries: MetadataRoute.Sitemap = products
    .filter((p) =>
      isProductPageIndexable({
        coverageDays: p.priceStats?.coverageDays ?? 0,
        hasDescription: Boolean(p.description),
        specCount:
          p.specifications && typeof p.specifications === "object"
            ? Object.keys(p.specifications as Record<string, unknown>).length
            : 0,
      }),
    )
    .map((p) => ({
      url: `${siteConfig.url}/produto/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${siteConfig.url}/categorias/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const contentEntries: MetadataRoute.Sitemap = content.map((c) => ({
    url: `${siteConfig.url}/${c.contentType === "BEST_OF" ? "melhores" : "comparar"}/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...guideEntries,
    ...productEntries,
    ...categoryEntries,
    ...contentEntries,
  ];
}
