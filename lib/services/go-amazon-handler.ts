import { prisma } from "@/lib/db";
import { resolveAffiliateRedirect, AffiliateRedirectError } from "@/lib/services/affiliate-redirect";
import { logger } from "@/lib/observability/logger";
import type { MarketplaceCode } from "@/types/marketplace";

export type GoAmazonResult =
  | { status: "redirect"; destination: string }
  | { status: "error"; errorStatus: number; errorMessage: string };

/**
 * Shared implementation behind app/go/amazon/[...segments]/route.ts, which
 * serves both /go/amazon/[asin] (BR, preserved exactly as-is for existing
 * links/SEO) and /go/amazon/[marketplace]/[asin] (prepared for future
 * marketplaces — project brief Sprint 3 Part 4) from one catch-all route.
 * One implementation here means the click-tracking-then-redirect flow can't
 * drift between the two URL shapes.
 *
 * Looks up the product by (provider, marketplace, asin) — now that Product
 * is marketplace-scoped (Sprint 4), the same ASIN can legitimately be two
 * different Product rows for BR and US, and this must resolve the one that
 * matches the marketplace actually being requested, not just any row with
 * that ASIN.
 */
export async function handleGoAmazonRequest(
  marketplace: MarketplaceCode,
  asin: string,
  searchParams: URLSearchParams,
): Promise<GoAmazonResult> {
  const product = await prisma.product.findUnique({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace, asin } },
    include: { offers: { orderBy: { observedAt: "desc" }, take: 1 } },
  });

  let destination: string;
  try {
    destination = resolveAffiliateRedirect({
      asin,
      marketplace,
      productActive: product?.active ?? false,
      affiliateUrl: product?.offers[0]?.affiliateUrl ?? null,
    });
  } catch (err) {
    if (err instanceof AffiliateRedirectError) {
      logger.warn("affiliate.redirect_rejected", {
        marketplace,
        asin,
        status: err.status,
      });
      return { status: "error", errorStatus: err.status, errorMessage: err.message };
    }
    throw err;
  }

  logger.info("affiliate.redirect", { marketplace, asin, productFound: Boolean(product) });

  if (product) {
    await prisma.affiliateClick.create({
      data: {
        productId: product.id,
        provider: "AMAZON",
        pageType: searchParams.get("pageType") ?? "unknown",
        pageSlug: searchParams.get("pageSlug") ?? product.slug,
        source: searchParams.get("source") ?? undefined,
        campaign: searchParams.get("campaign") ?? undefined,
      },
    });
  }

  return { status: "redirect", destination };
}
