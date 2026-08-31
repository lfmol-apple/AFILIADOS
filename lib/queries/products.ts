import { prisma } from "@/lib/db";
import { PRIMARY_PUBLIC_MARKETPLACE } from "@/lib/config/marketplaces";
import { currentlyVisibleDataSources } from "@/lib/config/public-catalog";

/**
 * The public site (/, /ofertas, /produto, /categorias, /melhores,
 * /comparar) serves exactly one marketplace at a time. Every query in this
 * file filters on this constant explicitly — never "just findMany Product"
 * — so BR and US products never mix when the deployed catalog changes.
 * Grep for `PUBLIC_MARKETPLACE` before adding a new public query.
 */
const PUBLIC_MARKETPLACE = PRIMARY_PUBLIC_MARKETPLACE;

/** Every public query also filters on this — see
 * lib/config/public-catalog.ts's currentlyVisibleDataSources(). MOCK rows
 * never appear while AMAZON_PROVIDER=mock in production; MANUAL_VERIFIED
 * rows only appear once MANUAL_PRODUCTS_ENABLED is turned on. An empty
 * array (both gates closed) correctly returns zero rows, not an error —
 * Prisma's `{ in: [] }` never matches anything. */
function visibleDataSourceFilter() {
  return { dataSource: { in: currentlyVisibleDataSources() } };
}

function localDraftProductPreviewEnabled() {
  return process.env.NODE_ENV === "development";
}

const PRODUCT_LIST_INCLUDE = {
  category: true,
  offers: { orderBy: { observedAt: "desc" as const }, take: 1 },
  priceStats: true,
  opportunityScore: true,
};

export async function getHomeSections() {
  const dataSourceFilter = visibleDataSourceFilter();

  const [pricesDropping, bestOpportunities, popularProducts, categories] =
    await Promise.all([
      prisma.product.findMany({
        where: {
          marketplace: PUBLIC_MARKETPLACE,
          active: true,
          priceStats: { dropPercentage: { gt: 5 } },
          ...dataSourceFilter,
        },
        include: PRODUCT_LIST_INCLUDE,
        orderBy: { priceStats: { dropPercentage: "desc" } },
        take: 8,
      }),
      prisma.product.findMany({
        where: {
          marketplace: PUBLIC_MARKETPLACE,
          active: true,
          opportunityScore: { score: { gte: 75 } },
          ...dataSourceFilter,
        },
        include: PRODUCT_LIST_INCLUDE,
        orderBy: { opportunityScore: { score: "desc" } },
        take: 8,
      }),
      prisma.product.findMany({
        where: {
          marketplace: PUBLIC_MARKETPLACE,
          active: true,
          ...dataSourceFilter,
        },
        include: PRODUCT_LIST_INCLUDE,
        orderBy: { createdAt: "desc" },
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
          products: {
            some: {
              marketplace: PUBLIC_MARKETPLACE,
              active: true,
              ...dataSourceFilter,
            },
          },
        },
        include: {
          _count: {
            select: {
              products: {
                where: {
                  marketplace: PUBLIC_MARKETPLACE,
                  active: true,
                  ...dataSourceFilter,
                },
              },
            },
          },
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

  return {
    pricesDropping,
    bestOpportunities,
    popularProducts,
    categories,
    guides,
  };
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
    marketplace: PUBLIC_MARKETPLACE,
    active: true,
    ...visibleDataSourceFilter(),
    ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { brand: { contains: query, mode: "insensitive" as const } },
            {
              category: {
                name: { contains: query, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_LIST_INCLUDE,
      orderBy: [{ opportunityScore: { score: "desc" } }, { createdAt: "desc" }],
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

/** Looks up a product by slug for the public BR site. Slugs are globally
 * unique in the schema (Product.slug @unique across all marketplaces), so
 * this can't accidentally resolve a US row today — but the marketplace
 * filter is kept explicit anyway, both for defense-in-depth and so this
 * function still does the right thing once a second marketplace exists
 * with its own slugged URLs (see docs/AMAZON.md "Slugs" for the future US
 * URL strategy). */
export async function getProductBySlug(slug: string) {
  const publicWhere = {
    slug,
    marketplace: PUBLIC_MARKETPLACE,
    active: true,
    ...visibleDataSourceFilter(),
  };

  return prisma.product.findFirst({
    where: localDraftProductPreviewEnabled()
      ? {
          OR: [
            publicWhere,
            {
              slug,
              marketplace: PUBLIC_MARKETPLACE,
              active: false,
              dataSource: "MANUAL_VERIFIED",
            },
          ],
        }
      : publicWhere,
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
    where: {
      marketplace: PUBLIC_MARKETPLACE,
      active: true,
      categoryId,
      id: { not: excludeProductId },
      ...visibleDataSourceFilter(),
    },
    include: PRODUCT_LIST_INCLUDE,
    orderBy: { opportunityScore: { score: "desc" } },
    take: 4,
  });
}

export type CategorySort = "score" | "drop" | "price";

/** Re-sorts the already-fetched (max 48) products in memory rather than
 * asking Prisma to order by a to-many relation's latest row (price lives
 * on Offer, a 1:N relation) — simplest correct option at this scale, no
 * new query shape needed per sort. */
function sortCategoryProducts<
  T extends {
    opportunityScore: { score: number } | null;
    priceStats: { dropPercentage: number | null } | null;
    offers: { price: unknown }[];
  },
>(products: T[], sort: CategorySort): T[] {
  const sorted = [...products];
  if (sort === "drop") {
    sorted.sort(
      (a, b) =>
        (b.priceStats?.dropPercentage ?? -1) -
        (a.priceStats?.dropPercentage ?? -1),
    );
  } else if (sort === "price") {
    sorted.sort(
      (a, b) =>
        Number(a.offers[0]?.price ?? Infinity) -
        Number(b.offers[0]?.price ?? Infinity),
    );
  } else {
    sorted.sort(
      (a, b) =>
        (b.opportunityScore?.score ?? -1) - (a.opportunityScore?.score ?? -1),
    );
  }
  return sorted;
}

export async function getCategoryBySlug(
  slug: string,
  sort: CategorySort = "score",
) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return null;

  const products = await prisma.product.findMany({
    where: {
      marketplace: PUBLIC_MARKETPLACE,
      active: true,
      categoryId: category.id,
      ...visibleDataSourceFilter(),
    },
    include: PRODUCT_LIST_INCLUDE,
    orderBy: { opportunityScore: { score: "desc" } },
    take: 48,
  });

  return { category, products: sortCategoryProducts(products, sort) };
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
