import { prisma } from "@/lib/db";
import { shopeeNumeric, type ShopeeProductOfferNode, type ShopeeProvider } from "@/lib/providers/shopee-provider";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import { saveApiGeneratedAffiliateLink } from "@/lib/services/affiliate-link-registry";
import { buildShopeeSubIds } from "@/lib/services/shopee-attribution";
import type { MonetizationScoreInput } from "@/types/monetization";

/**
 * Shared per-offer logic, extracted from scripts/shopee-first-cycle.ts
 * (Automação Operacional V1, 2026-09-08) so the manual script and the
 * automated job (jobs/shopee-refresh.ts) run the exact same real-API-call
 * and persistence code. Behavior unchanged from the original script.
 */

// Simple, documented linear mappings from Shopee's own real fields onto our
// 0-100 score scale — the inputs (commissionRate, sales, ratingStar) are
// always real/sourced; only the mapping curve is a judgment call, made
// explicit here rather than hidden inside calculateMonetizationScore.
export function commissionToScore(rate: number): number {
  return Math.min(100, Math.round(rate * 100 * 4)); // 25%+ commission -> 100
}
export function salesToScore(sales: number): number {
  return Math.min(100, Math.round(Math.log10(sales + 1) * 25));
}
export function ratingToScore(rating: number): number {
  return Math.min(100, Math.round((rating / 5) * 100));
}

export function scoreOffer(offer: ShopeeProductOfferNode) {
  const commissionRate = shopeeNumeric(offer.commissionRate);
  const ratingStar = shopeeNumeric(offer.ratingStar);
  const input: MonetizationScoreInput = {
    demandSignal:
      offer.sales !== undefined
        ? { value: salesToScore(offer.sales), quality: "OBSERVED" }
        : null,
    commissionSignal:
      commissionRate !== undefined
        ? { value: commissionToScore(commissionRate), quality: "OBSERVED" }
        : null,
    trendSignal: null, // productOfferV2 has no trend field.
    historicalConversionSignal: null, // no internal history yet.
    offerQualitySignal:
      ratingStar !== undefined
        ? { value: ratingToScore(ratingStar), quality: "OBSERVED" }
        : null,
  };
  return calculateMonetizationScore(input);
}

export interface ProcessShopeeOfferResult {
  listingCreated: boolean;
  linkGenerated: boolean;
  linkReused: boolean;
}

/** One real offer end-to-end: upsert MerchantListing, persist the signal,
 * upsert MonetizationScore, and — only when no ACTIVE link exists yet —
 * generate a real Shopee affiliate link (sub_id1=precocaindo preserved via
 * buildShopeeSubIds, unchanged). Never re-generates a link for a listing
 * that already has an ACTIVE one (idempotent, and avoids burning API
 * budget on a rerun). Source label is passed through to the sub_ids so a
 * later conversion report can distinguish an automated cycle from the
 * original manual "first_cycle" run. */
export async function processShopeeOffer(
  provider: ShopeeProvider,
  merchantId: string,
  offer: ShopeeProductOfferNode,
  source: string,
): Promise<ProcessShopeeOfferResult> {
  const score = scoreOffer(offer);

  const existingListing = await prisma.merchantListing.findUnique({
    where: {
      merchantId_marketplace_externalId: {
        merchantId,
        marketplace: "BR",
        externalId: String(offer.itemId),
      },
    },
    select: { id: true },
  });

  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId,
        marketplace: "BR",
        externalId: String(offer.itemId),
      },
    },
    create: {
      merchantId,
      externalId: String(offer.itemId),
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: offer.productLink,
      source: "MANUAL_VERIFIED",
    },
    update: { productUrl: offer.productLink },
  });

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "shopee_product_offer_v2",
      commissionRate: shopeeNumeric(offer.commissionRate),
      estimatedCommissionAmount: shopeeNumeric(offer.commission),
      sellerExtraCommission: shopeeNumeric(offer.sellerCommissionRate),
      soldQuantity: offer.sales,
      rating: shopeeNumeric(offer.ratingStar),
      // General Market Scanner V1 (2026-09-08): `source` (already passed
      // in for the affiliate link's sub_ids — "shopee_refresh" for
      // general discovery, "shopee_demand_driven" for the ML-term-driven
      // path) is also tagged onto the real signal itself, reusing the
      // existing free-form `raw` column — every listing now knows which
      // scan actually found it, no schema change needed.
      raw: { ...offer, discoverySource: source } as unknown as object,
    },
  });

  await prisma.monetizationScore.upsert({
    where: { merchantListingId: listing.id },
    create: {
      merchantListingId: listing.id,
      score: score.score,
      confidence: score.confidence,
      components: score.components as unknown as object,
      reasons: score.reasons,
      missingSignals: score.missingSignals,
    },
    update: {
      score: score.score,
      confidence: score.confidence,
      components: score.components as unknown as object,
      reasons: score.reasons,
      missingSignals: score.missingSignals,
      calculatedAt: new Date(),
    },
  });

  const existingLink = await prisma.affiliateLinkRegistry.findUnique({
    where: { merchantListingId: listing.id },
  });
  if (existingLink?.status === "ACTIVE") {
    return { listingCreated: !existingListing, linkGenerated: false, linkReused: true };
  }

  const subIds = buildShopeeSubIds({ source, opportunityId: listing.id });
  const affiliateUrl = await provider.generateAffiliateLink(offer.productLink, subIds);
  await saveApiGeneratedAffiliateLink({
    merchantListingId: listing.id,
    merchantId,
    merchantCode: "SHOPEE",
    publicUrl: offer.productLink,
    affiliateUrl,
    attributionTag: subIds[0]!,
  });

  return { listingCreated: !existingListing, linkGenerated: true, linkReused: false };
}
