import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { siteConfig } from "@/lib/config/site";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, content] = await Promise.all([
    prisma.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.generatedContent.findMany({
      where: { status: "PUBLISHED" },
      select: { contentType: true, slug: true, updatedAt: true },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteConfig.url}${path}`,
    changeFrequency: path === "" || path === "/ofertas" ? "daily" : "monthly",
    priority: path === "" ? 1 : 0.5,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${siteConfig.url}/produto/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "daily",
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
    ...productEntries,
    ...categoryEntries,
    ...contentEntries,
  ];
}
