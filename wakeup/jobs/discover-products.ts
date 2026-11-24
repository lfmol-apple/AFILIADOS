import { prisma } from "@/lib/db";
import { getCommerceProvider } from "@/lib/providers";
import { findOrCreateCategory } from "@/lib/services/category";
import { generateUniqueSlug } from "@/lib/services/slug";
import { DISCOVERY_SEED_KEYWORDS } from "@/lib/config/discovery";
import { getEnabledMarketplaces } from "@/lib/config/marketplaces";
import { runJob, mergeJobCounters, type JobContext, type JobCounters } from "@/lib/jobs/automation-run";
import type { NormalizedProduct } from "@/types/commerce";
import type { MarketplaceCode } from "@/types/marketplace";

async function upsertDiscoveredProduct(marketplace: MarketplaceCode, product: NormalizedProduct, ctx: JobContext) {
  ctx.counters.processed += 1;

  const existing = await prisma.product.findUnique({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace, asin: product.asin } },
  });
  if (existing) return;

  const category = product.categoryName ? await findOrCreateCategory(product.categoryName) : null;
  const slug = await generateUniqueSlug(product.title, product.asin, async (s) => {
    const taken = await prisma.product.findUnique({ where: { slug: s } });
    return taken !== null;
  });

  await prisma.product.create({
    data: {
      asin: product.asin,
      provider: "AMAZON",
      marketplace,
      slug,
      title: product.title,
      brand: product.brand,
      description: product.description,
      imageUrl: product.imageUrl,
      categoryId: category?.id,
      specifications: product.specifications,
      rating: product.rating,
      reviewCount: product.reviewCount,
      offers: {
        create: {
          provider: "AMAZON",
          price: product.offer.price,
          currency: product.offer.currency,
          originalPrice: product.offer.originalPrice,
          discountPercentage: product.offer.discountPercentage,
          affiliateUrl: product.offer.affiliateUrl,
          availability: product.offer.availability,
          observedAt: product.offer.observedAt,
        },
      },
      priceHistory: {
        create: {
          provider: "AMAZON",
          price: product.offer.price,
          observedAt: product.offer.observedAt,
        },
      },
    },
  });

  ctx.counters.created += 1;
}

async function discoverProductsForMarketplace(marketplace: MarketplaceCode): Promise<JobCounters> {
  return runJob(
    "DISCOVER_PRODUCTS",
    async (ctx) => {
      const provider = getCommerceProvider(marketplace);
      const seen = new Set<string>();

      for (const keywords of DISCOVERY_SEED_KEYWORDS) {
        const result = await provider.searchProducts({ keywords });
        for (const product of result.products) {
          if (seen.has(product.asin)) continue;
          seen.add(product.asin);
          try {
            await upsertDiscoveredProduct(marketplace, product, ctx);
          } catch (err) {
            ctx.counters.errors += 1;
            ctx.metadata[`error_${product.asin}`] = String(err);
          }
        }
      }
    },
    { marketplace },
  );
}

/**
 * Discovers new products from the active CommerceProvider using a
 * configured set of seed keywords, for every enabled marketplace. Each
 * marketplace runs (and is recorded via AutomationRun) independently — only
 * BR is enabled today, so this loop runs once, but the loop itself is real,
 * not aspirational (project brief Sprint 4 section 6). Idempotent: existing
 * (provider, marketplace, asin) triples are left untouched here — price
 * refreshing is REFRESH_PRIORITY_PRODUCTS / REFRESH_CATALOG's job.
 */
export async function discoverProducts(): Promise<JobCounters> {
  const results: JobCounters[] = [];
  for (const marketplace of getEnabledMarketplaces()) {
    results.push(await discoverProductsForMarketplace(marketplace));
  }
  return mergeJobCounters(results);
}
