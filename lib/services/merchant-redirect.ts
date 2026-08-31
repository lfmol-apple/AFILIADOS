import { prisma } from "@/lib/db";
import {
  isMarketplaceCode,
  PRIMARY_PUBLIC_MARKETPLACE,
} from "@/lib/config/marketplaces";
import {
  assertAllowedMerchantDestination,
  buildMerchantAffiliateUrl,
  isMerchantCode,
  MerchantRoutingError,
} from "@/lib/merchants/config";
import { logger } from "@/lib/observability/logger";

export type MerchantRedirectResult =
  | { status: "redirect"; destination: string }
  | { status: "error"; errorStatus: number; errorMessage: string };

export async function resolveMerchantRedirect(input: {
  merchant: string;
  externalId: string;
  searchParams: URLSearchParams;
}): Promise<MerchantRedirectResult> {
  if (!isMerchantCode(input.merchant)) {
    return {
      status: "error",
      errorStatus: 400,
      errorMessage: `Merchant desconhecido: ${input.merchant}`,
    };
  }

  try {
    const marketplaceParam = input.searchParams.get("marketplace");
    const marketplace =
      marketplaceParam && isMarketplaceCode(marketplaceParam)
        ? marketplaceParam
        : PRIMARY_PUBLIC_MARKETPLACE;
    const product =
      input.merchant === "amazon"
        ? await prisma.product.findFirst({
            where: {
              provider: "AMAZON",
              marketplace,
              asin: input.externalId,
              active: true,
            },
            include: { merchantListings: true },
          })
        : null;

    const destination =
      input.merchant === "amazon" && product
        ? buildMerchantAffiliateUrl({
            merchant: input.merchant,
            externalId: input.externalId,
            marketplace: product.marketplace,
          })
        : buildMerchantAffiliateUrl({
            merchant: input.merchant,
            externalId: input.externalId,
          });

    const validated = assertAllowedMerchantDestination(
      destination,
      input.merchant,
    );

    if (product) {
      const listing = product.merchantListings[0];
      await prisma.affiliateClick.create({
        data: {
          productId: product.id,
          canonicalProductId: product.canonicalProductId,
          merchantListingId: listing?.id,
          merchantId: listing?.merchantId,
          provider: "AMAZON",
          pageType: input.searchParams.get("pageType") ?? "unknown",
          pageSlug: input.searchParams.get("pageSlug") ?? product.slug,
          source: input.searchParams.get("source") ?? undefined,
          campaign: input.searchParams.get("campaign") ?? undefined,
        },
      });
    }

    logger.info("merchant.redirect", {
      merchant: input.merchant,
      externalId: input.externalId,
      productFound: Boolean(product),
    });

    return { status: "redirect", destination: validated.toString() };
  } catch (err) {
    if (err instanceof MerchantRoutingError) {
      return {
        status: "error",
        errorStatus: err.status,
        errorMessage: err.message,
      };
    }
    throw err;
  }
}
