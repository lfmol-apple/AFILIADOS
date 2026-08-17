import { prisma } from "@/lib/db";

const PRODUCT_LIST_INCLUDE = {
  category: true,
  offers: { orderBy: { observedAt: "desc" as const }, take: 1 },
  priceStats: true,
  opportunityScore: true,
};

export async function getHomeSections() {
  const [pricesDropping, bestOpportunities, categories] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, priceStats: { dropPercentage: { gt: 5 } } },
      include: PRODUCT_LIST_INCLUDE,
      orderBy: { priceStats: { dropPercentage: "desc" } },
      take: 8,
    }),
    prisma.product.findMany({
      where: { active: true, opportunityScore: { score: { gte: 75 } } },
      include: PRODUCT_LIST_INCLUDE,
      orderBy: { opportunityScore: { score: "desc" } },
      take: 8,
    }),
    prisma.category.findMany({
      where: { active: true, parentId: null },
      include: {
        _count: { select: { products: { where: { active: true } } } },
      },
      orderBy: { name: "asc" },
      take: 12,
    }),
  ]);

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

export async function getOfertas({
  page = 1,
  pageSize = 24,
  categorySlug,
  query,
}: OfertasFilter = {}) {
  const where = {
    active: true,
    opportunityScore: { isNot: null },
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(query
      ? { title: { contains: query, mode: "insensitive" as const } }
      : {}),
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

export type ProductListItem = Awaited<
  ReturnType<typeof getOfertas>
>["items"][number];

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      offers: { orderBy: { observedAt: "desc" }, take: 1 },
      priceHistory: { orderBy: { observedAt: "asc" } },
      priceStats: true,
      opportunityScore: true,
    },
  });
}

export async function getSimilarProducts(
  categoryId: string | null,
  excludeProductId: string,
) {
  if (!categoryId) return [];
  return prisma.product.findMany({
    where: { active: true, categoryId, id: { not: excludeProductId } },
    include: PRODUCT_LIST_INCLUDE,
    orderBy: { opportunityScore: { score: "desc" } },
    take: 4,
  });
}

export async function getCategoryBySlug(slug: string) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return null;

  const products = await prisma.product.findMany({
    where: { active: true, categoryId: category.id },
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

export async function getPublishedContent(
  contentType: "BEST_OF" | "COMPARISON" | "CATEGORY",
  slug: string,
) {
  return prisma.generatedContent.findUnique({
    where: { contentType_slug: { contentType, slug } },
  });
}
