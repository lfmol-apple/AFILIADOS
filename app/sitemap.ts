import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/config/site";
import { isProductPageIndexable } from "@/lib/seo/indexability";

export const revalidate = 3600;

const STATIC_ROUTES = [
  "",
  "/ofertas",
  "/transparencia",
  "/sobre",
  "/como-funciona",
  "/metodologia",
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
  const [products, categories, content] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: {
        slug: true,
        updatedAt: true,
        description: true,
        specifications: true,
        priceStats: { select: { coverageDays: true } },
      },
    }),
    prisma.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    prisma.generatedContent.findMany({
      where: { status: "PUBLISHED", noindex: false },
      select: { contentType: true, slug: true, updatedAt: true },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: path === "" || path === "/ofertas" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

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

  return [...staticEntries, ...productEntries, ...categoryEntries, ...contentEntries];
}
