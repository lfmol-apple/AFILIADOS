import { prisma } from "@/lib/db";
import {
  assertAllowedMerchantDestination,
  isMerchantCode,
  MerchantRoutingError,
  type MerchantCode,
} from "@/lib/merchants/config";
import { logger } from "@/lib/observability/logger";
import type { CommerceProviderName } from "@prisma/client";
import { OWNER_CLICK_MEDIUM } from "@/lib/admin/owner-traffic";

export type VitrineRedirectResult =
  | { status: "redirect"; destination: string }
  | { status: "error"; errorStatus: number; errorMessage: string };

/** Vitrine Inteligente is Mercado Livre only (project brief section 1) —
 * no Amazon/Shopee branch needed here, unlike merchant-redirect.ts. */
const VITRINE_MERCHANT_TO_PROVIDER: Record<string, CommerceProviderName> = {
  "mercado-livre": "MERCADO_LIVRE",
};

/**
 * Same shape as resolveGenericMerchantRedirect (lib/services/merchant-
 * redirect.ts), reading VitrineLink instead of AffiliateLinkRegistry, and
 * always tagging the click campaign="vitrine_dinamica" — the whole reason
 * this is a separate route instead of reusing /go/[merchant]/[externalId]:
 * clicks from the Meta catalog must be attributable to the Vitrine, never
 * mixed into the site's own "precocaindo" click log.
 */
export async function resolveVitrineRedirect(input: {
  merchant: string;
  externalId: string;
  searchParams: URLSearchParams;
  isOwner?: boolean;
  isPrefetch?: boolean;
}): Promise<VitrineRedirectResult> {
  if (!isMerchantCode(input.merchant)) {
    return {
      status: "error",
      errorStatus: 400,
      errorMessage: `Merchant desconhecido: ${input.merchant}`,
    };
  }
  const provider = VITRINE_MERCHANT_TO_PROVIDER[input.merchant];
  if (!provider) {
    return {
      status: "error",
      errorStatus: 404,
      errorMessage: `A Vitrine Inteligente ainda não cobre ${input.merchant}.`,
    };
  }

  const listing = await prisma.merchantListing.findFirst({
    where: {
      merchant: { code: provider },
      externalId: input.externalId,
      active: true,
    },
    include: {
      vitrineLink: true,
      canonicalProduct: { select: { title: true } },
    },
  });

  if (
    !listing ||
    listing.vitrineLink?.status !== "ACTIVE" ||
    !listing.vitrineLink.affiliateUrl
  ) {
    return {
      status: "error",
      errorStatus: 404,
      errorMessage: `Nenhum link vitrinedinamica ativo para ${input.merchant}/${input.externalId} ainda.`,
    };
  }

  try {
    const validated = assertAllowedMerchantDestination(
      listing.vitrineLink.affiliateUrl,
      input.merchant as MerchantCode,
    );

    if (!input.isPrefetch) {
      await prisma.affiliateClick.create({
        data: {
          canonicalProductId: listing.canonicalProductId,
          merchantId: listing.merchantId,
          merchantListingId: listing.id,
          provider,
          pageType: input.searchParams.get("pageType") ?? "unknown",
          pageSlug: input.searchParams.get("pageSlug") ?? listing.externalId,
          source: input.searchParams.get("source") ?? "meta_catalog",
          medium: input.isOwner ? OWNER_CLICK_MEDIUM : "paid_social",
          campaign: "vitrine_dinamica",
        },
      });
    }

    logger.info("vitrine.redirect", {
      merchant: input.merchant,
      externalId: input.externalId,
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
