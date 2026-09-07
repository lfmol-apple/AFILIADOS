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
  type MerchantCode,
} from "@/lib/merchants/config";
import { logger } from "@/lib/observability/logger";
import type { CommerceProviderName } from "@prisma/client";

export type MerchantRedirectResult =
  | { status: "redirect"; destination: string }
  | { status: "error"; errorStatus: number; errorMessage: string };

const MERCHANT_TO_PROVIDER: Record<MerchantCode, CommerceProviderName | null> = {
  amazon: "AMAZON",
  "mercado-livre": "MERCADO_LIVRE",
  shopee: "SHOPEE",
  awin: null,
  "generic-affiliate": null,
};

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

  // Amazon path — byte-for-byte unchanged from before this function grew a
  // second branch. Never touch this without an explicit regression test
  // (tests/merchant-redirect-amazon-regression.test.ts).
  if (input.merchant === "amazon") {
    return resolveAmazonRedirect({ ...input, merchant: "amazon" });
  }

  return resolveGenericMerchantRedirect(
    input as typeof input & { merchant: Exclude<MerchantCode, "amazon"> },
  );
}

async function resolveAmazonRedirect(input: {
  merchant: "amazon";
  externalId: string;
  searchParams: URLSearchParams;
}): Promise<MerchantRedirectResult> {
  try {
    const marketplaceParam = input.searchParams.get("marketplace");
    const marketplace =
      marketplaceParam && isMarketplaceCode(marketplaceParam)
        ? marketplaceParam
        : PRIMARY_PUBLIC_MARKETPLACE;
    const product = await prisma.product.findFirst({
      where: {
        provider: "AMAZON",
        marketplace,
        asin: input.externalId,
        active: true,
      },
      include: { merchantListings: true },
    });

    const destination = product
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

/**
 * Mercado Livre / Shopee / any future merchant: looks up MerchantListing +
 * its AffiliateLinkRegistry (added in this PR — see
 * docs/AFFILIATE_LINK_REGISTRY.md) instead of reconstructing a URL via
 * buildMerchantAffiliateUrl, which only ever knows how to build an Amazon
 * link. No ACTIVE link -> 404, same fail-closed behavior as before, just
 * now actually able to succeed once a real link exists (previously this
 * path always 404'd unconditionally for every non-Amazon merchant).
 */
async function resolveGenericMerchantRedirect(input: {
  merchant: Exclude<MerchantCode, "amazon">;
  externalId: string;
  searchParams: URLSearchParams;
}): Promise<MerchantRedirectResult> {
  const provider = MERCHANT_TO_PROVIDER[input.merchant];
  if (!provider) {
    return {
      status: "error",
      errorStatus: 404,
      errorMessage: `Merchant ${input.merchant} ainda não possui integração legítima habilitada.`,
    };
  }

  const listing = await prisma.merchantListing.findFirst({
    where: {
      merchant: { code: provider },
      externalId: input.externalId,
      active: true,
    },
    include: { affiliateLink: true },
  });

  if (!listing || listing.affiliateLink?.status !== "ACTIVE" || !listing.affiliateLink.affiliateUrl) {
    return {
      status: "error",
      errorStatus: 404,
      errorMessage: `Nenhum link afiliado ativo para ${input.merchant}/${input.externalId} ainda.`,
    };
  }

  try {
    const validated = assertAllowedMerchantDestination(
      listing.affiliateLink.affiliateUrl,
      input.merchant,
    );

    await prisma.affiliateClick.create({
      data: {
        canonicalProductId: listing.canonicalProductId,
        merchantId: listing.merchantId,
        merchantListingId: listing.id,
        provider,
        pageType: input.searchParams.get("pageType") ?? "unknown",
        pageSlug: input.searchParams.get("pageSlug") ?? listing.externalId,
        source: input.searchParams.get("source") ?? undefined,
        medium: input.searchParams.get("medium") ?? undefined,
        campaign: input.searchParams.get("campaign") ?? undefined,
      },
    });

    logger.info("merchant.redirect", {
      merchant: input.merchant,
      externalId: input.externalId,
      productFound: true,
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
