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
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";

export type VitrineRedirectResult =
  | {
      status: "redirect";
      destination: string;
      /** Owner's directive, 2026-11-25 ("PIXEL DA META – AJUSTE NA
       * VITRINE PRECOCAINDO"): the real product identity, for the
       * caller (the route) to fire ViewContent/AddToCart on the
       * interstitial page before forwarding — the exact same
       * merchantListingId the Meta catalog feed publishes as `g:id`,
       * never a different id. `currentPrice` is null only when
       * genuinely unknown, same convention as everywhere else Pixel
       * events are fired — the caller must skip firing in that case,
       * never send a guessed value. */
      merchantListingId: string;
      title: string;
      currentPrice: number | null;
    }
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

    // Real, verified price — same source every other Pixel event in this
    // project trusts (lib/services/merchant-listing-facts.ts), never a
    // field guessed from `listing` alone (ML "catalog" aggregation needs
    // the sibling-offer logic that function already encapsulates). Null
    // only when genuinely unknown; the caller (the route) must then skip
    // firing ViewContent/AddToCart, same rule as everywhere else.
    const facts = await loadMerchantListingFactsByListingId(listing.id).catch(() => null);

    return {
      status: "redirect",
      destination: validated.toString(),
      merchantListingId: listing.id,
      title: listing.canonicalProduct?.title ?? facts?.title ?? listing.externalId,
      currentPrice: facts?.currentPrice ?? null,
    };
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
