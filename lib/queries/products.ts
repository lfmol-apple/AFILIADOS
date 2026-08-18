import { prisma } from "@/lib/db";
import { PRIMARY_PUBLIC_MARKETPLACE } from "@/lib/config/marketplaces";

/**
 * The public site (/, /ofertas, /produto, /categorias, /melhores,
 * /comparar) is BR-only today (project brief Sprint 4 section 8). Every
 * query in this file filters on this constant explicitly — never "just
 * findMany Product" — so that enabling a second marketplace later can
 * never silently leak USD products onto precocaindo.com.br. Grep for
 * `PUBLIC_MARKETPLACE` before adding a new public query.
 */
const PUBLIC_MARKETPLACE = PRIMARY_PUBLIC_MARKETPLACE;

const PRODUCT_LIST_INCLUDE = {
  category: true,
  offers: { orderBy: { observedAt: "desc" as const }, take: 1 },
  priceStats: true,
  opportunityScore: true,
};

export async function getHomeSections() {
  const [pricesDropping, bestOpportunities, categories] = await Promise.all([
    prisma.product.findMany({
      where: { marketplace: PUBLIC_MARKETPLACE, active: true, priceStats: { dropPercentage: { gt: 5 } } },
      include: PRODUCT_LIST_INCLUDE,
      orderBy: { priceStats: { dropPercentage: "desc" } },
      take: 8,
    }),
    prisma.product.findMany({
      where: { marketplace: PUBLIC_MARKETPLACE, active: true, opportunityScore: { score: { gte: 75 } } },
      include: PRODUCT_LIST_INCLUDE,
      orderBy: { opportunityScore: { score: "desc" } },
      take: 8,
    }),
    prisma.category.findMany({
      where: {
        active: true,
        parentId: null,
        // A Category is shared across marketplaces (it's PreçoCaindo's own
        // taxonomy, not Amazon's), so only the product _count needs the
        // marketplace filter — otherwise a category with only US products
        // would show a nonzero count on the BR homepage.
        products: { some: { marketplace: PUBLIC_MARKETPLACE, active: true } },
      },
      include: {
        _count: { select: { products: { where: { marketplace: PUBLIC_MARKETPLACE, active: true } } } },
      },
      orderBy: { name: "asc" },
      take: 12,
    }),
  ]);

  // GeneratedContent has no marketplace column: the content/editorial
  // pipeline is hardcoded BR-only end-to-end today (see the comment in
  // jobs/discover-content-opportunities.ts), so there is nothing to filter
  // yet. Revisit together when content generation itself goes
  // multi-marketplace — don't add the column in isolation here.
  const guides = await prisma.generatedContent.findMany({
    where: {
      status: "PUBLISHED",
      contentType: { in: ["BEST_OF", "COMPARISON"] },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
  });

  return { pricesDropping, bestOpportunities, categories, guides };
}

export interface OfertasFilter {
  page?: number;
  pageSize?: number;
  categorySlug?: string;
  query?: string;
}

export async function getOfertas({ page = 1, pageSize = 24, categorySlug, query }: OfertasFilter = {}) {
  const where = {
    marketplace: PUBLIC_MARKETPLACE,
    active: true,
    opportunityScore: { isNot: null },
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(query ? { title: { contains: query, mode: "insensitive" as const } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_LIST_INCLUDE,
      orderBy: { opportunityScore: { score: "desc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type ProductListItem = Awaited<ReturnType<typeof getOfertas>>["items"][number];

/** Looks up a product by slug for the public BR site. Slugs are globally
 * unique in the schema (Product.slug @unique across all marketplaces), so
 * this can't accidentally resolve a US row today — but the marketplace
 * filter is kept explicit anyway, both for defense-in-depth and so this
 * function still does the right thing once a second marketplace exists
 * with its own slugged URLs (see docs/AMAZON.md "Slugs" for the future US
 * URL strategy). */
export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, marketplace: PUBLIC_MARKETPLACE },
    include: {
      category: true,
      offers: { orderBy: { observedAt: "desc" }, take: 1 },
      priceHistory: { orderBy: { observedAt: "asc" } },
      priceStats: true,
      opportunityScore: true,
    },
  });
}

export async function getSimilarProducts(categoryId: string | null, excludeProductId: string) {
  if (!categoryId) return [];
  return prisma.product.findMany({
    where: { marketplace: PUBLIC_MARKETPLACE, active: true, categoryId, id: { not: excludeProductId } },
    include: PRODUCT_LIST_INCLUDE,
    orderBy: { opportunityScore: { score: "desc" } },
    take: 4,
  });
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return null;

  const products = await prisma.product.findMany({
    where: { marketplace: PUBLIC_MARKETPLACE, active: true, categoryId: category.id },
    include: PRODUCT_LIST_INCLUDE,
    orderBy: { opportunityScore: { score: "desc" } },
    take: 48,
  });

  return { category, products };
}

export async function getAllActiveCategories() {
  return prisma.category.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function getPublishedContent(contentType: "BEST_OF" | "COMPARISON" | "CATEGORY", slug: string) {
  return prisma.generatedContent.findUnique({
    where: { contentType_slug: { contentType, slug } },
  });
}
