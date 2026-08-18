import { prisma } from "@/lib/db";
import {
  resolveAffiliateRedirect,
  AffiliateRedirectError,
} from "@/lib/services/affiliate-redirect";
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
 * Product lookup is still by (provider, asin) only — Product isn't
 * marketplace-scoped yet because there is no real second-marketplace data
 * to distinguish (US stays disabled); see docs/AMAZON.md for why that
 * split hasn't happened.
 */
export async function handleGoAmazonRequest(
  marketplace: MarketplaceCode,
  asin: string,
  searchParams: URLSearchParams,
): Promise<GoAmazonResult> {
  const product = await prisma.product.findUnique({
    where: { provider_asin: { provider: "AMAZON", asin } },
    include: { offers: { orderBy: { observedAt: "desc" }, take: 1 } },
  });

  let destination: string;
  try {
    destination = resolveAffiliateRedirect({
      asin,
      marketplace,
      productActive: product?.active ?? false,
      // A stored affiliateUrl is only meaningful for the marketplace it was
      // observed in; today that's always BR (see note above).
      affiliateUrl:
        marketplace === "BR"
          ? (product?.offers[0]?.affiliateUrl ?? null)
          : null,
    });
  } catch (err) {
    if (err instanceof AffiliateRedirectError) {
      return {
        status: "error",
        errorStatus: err.status,
        errorMessage: err.message,
      };
    }
    throw err;
  }

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
