import { prisma } from "@/lib/db";
import { buildAmazonProductUrl } from "@/lib/amazon/policy-guard";
import { isMarketplaceCode } from "@/lib/config/marketplaces";
import {
  calculatePriceStats,
  type PricePoint,
} from "@/lib/services/price-stats";
import { calculateOpportunityScore } from "@/lib/services/opportunity-score";
import type { MarketplaceCode } from "@/types/marketplace";
import type { Availability } from "@/types/commerce";

/**
 * Records one manually-verified price observation for a MANUAL_VERIFIED
 * product — the only way price data enters a product row without the
 * Creators API or scraping (project brief: "preço somente com fonte
 * oficial/permitida e timestamp claro"). A human checks the real
 * amazon.com.br listing and supplies exactly what they saw; this function
 * never guesses or backfills a number.
 *
 * Reuses the exact same pure functions the automated CALCULATE_PRICE_STATS
 * / CALCULATE_OPPORTUNITIES jobs use (calculatePriceStats,
 * calculateOpportunityScore) — a manually-entered price is scored with
 * identical, deterministic logic, never a separate "manual" formula.
 *
 * With a single data point, calculatePriceStats() correctly yields
 * dataPointCount=1, which the Decision Engine treats as insufficient
 * history (INSUFFICIENT_DATA) — the price displays, but no verdict is
 * asserted until real history accumulates. This is the honest, intended
 * behavior, not a bug to work around.
 */
export interface ManualPriceInput {
  asin: string;
  marketplace: string;
  price: number;
  currency?: string;
  originalPrice?: number | null;
  availability?: Availability;
}

export type ManualPriceError =
  | { code: "INVALID_MARKETPLACE"; message: string }
  | { code: "PRODUCT_NOT_FOUND"; message: string }
  | { code: "NOT_MANUAL_VERIFIED"; message: string }
  | { code: "INVALID_PRICE"; message: string };

export type ManualPriceResult =
  | {
      ok: true;
      productId: string;
      offerId: string;
      opportunityScore: number;
      insufficientHistory: boolean;
      affiliateUrl: string;
    }
  | { ok: false; error: ManualPriceError };

export async function recordManualPriceObservation(
  input: ManualPriceInput,
): Promise<ManualPriceResult> {
  if (!isMarketplaceCode(input.marketplace)) {
    return {
      ok: false,
      error: {
        code: "INVALID_MARKETPLACE",
        message: `Marketplace desconhecido: "${input.marketplace}".`,
      },
    };
  }
  const marketplace = input.marketplace as MarketplaceCode;

  if (!Number.isFinite(input.price) || input.price <= 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_PRICE",
        message: `Preço inválido: ${input.price}.`,
      },
    };
  }

  const product = await prisma.product.findUnique({
    where: {
      provider_marketplace_asin: {
        provider: "AMAZON",
        marketplace,
        asin: input.asin,
      },
    },
  });
  if (!product) {
    return {
      ok: false,
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: `Produto não encontrado: ${input.asin} / ${marketplace}.`,
      },
    };
  }
  if (product.dataSource !== "MANUAL_VERIFIED") {
    return {
      ok: false,
      error: {
        code: "NOT_MANUAL_VERIFIED",
        message: `Produto ${product.id} tem dataSource=${product.dataSource} — preço manual só é aceito para MANUAL_VERIFIED.`,
      },
    };
  }

  const now = new Date();
  const currency = input.currency ?? "BRL";
  const availability = input.availability ?? "IN_STOCK";
  const originalPrice = input.originalPrice ?? null;
  const discountPercentage =
    originalPrice && originalPrice > input.price
      ? Math.round(((originalPrice - input.price) / originalPrice) * 1000) / 10
      : null;

  await prisma.priceHistory.create({
    data: {
      productId: product.id,
      provider: "AMAZON",
      price: input.price,
      observedAt: now,
    },
  });

  const history = await prisma.priceHistory.findMany({
    where: { productId: product.id },
    orderBy: { observedAt: "asc" },
  });
  const points: PricePoint[] = history.map((h) => ({
    price: Number(h.price),
    observedAt: h.observedAt,
  }));
  const stats = calculatePriceStats(points, input.price, now);

  await prisma.priceStats.upsert({
    where: { productId: product.id },
    create: {
      productId: product.id,
      currentPrice: stats.currentPrice,
      lowestPrice: stats.lowestPrice,
      highestPrice: stats.highestPrice,
      avg7d: stats.avg7d,
      avg30d: stats.avg30d,
      avg90d: stats.avg90d,
      dropPercentage: stats.dropPercentage,
      distanceFromLow: stats.distanceFromLow,
      historicalPosition: stats.historicalPosition,
      dataPointCount: stats.dataPointCount,
      coverageDays: stats.coverageDays,
    },
    update: {
      currentPrice: stats.currentPrice,
      lowestPrice: stats.lowestPrice,
      highestPrice: stats.highestPrice,
      avg7d: stats.avg7d,
      avg30d: stats.avg30d,
      avg90d: stats.avg90d,
      dropPercentage: stats.dropPercentage,
      distanceFromLow: stats.distanceFromLow,
      historicalPosition: stats.historicalPosition,
      dataPointCount: stats.dataPointCount,
      coverageDays: stats.coverageDays,
      calculatedAt: now,
    },
  });

  // Preview-safe: only ever built from asin+marketplace, never persisted
  // separately elsewhere. Stored on Offer because the schema requires a
  // non-null affiliateUrl there — /go/amazon/[asin] still rebuilds this
  // itself at click time rather than trusting the stored value blindly is
  // not required here since this IS the source of truth Offer row.
  const affiliateUrl = buildAmazonProductUrl(input.asin, marketplace);

  const offer = await prisma.offer.create({
    data: {
      productId: product.id,
      provider: "AMAZON",
      price: input.price,
      currency,
      originalPrice: originalPrice ?? undefined,
      discountPercentage: discountPercentage ?? undefined,
      affiliateUrl,
      availability,
      observedAt: now,
    },
  });

  const opportunity = calculateOpportunityScore({
    currentPrice: input.price,
    listedDiscountPercentage: discountPercentage,
    rating: product.rating,
    reviewCount: product.reviewCount,
    availability,
    stats,
  });

  await prisma.opportunityScore.upsert({
    where: { productId: product.id },
    create: {
      productId: product.id,
      score: opportunity.score,
      priceScore: opportunity.priceScore,
      discountScore: opportunity.discountScore,
      popularityScore: opportunity.popularityScore,
      ratingScore: opportunity.ratingScore,
      historicalScore: opportunity.historicalScore,
      confidence: opportunity.confidence,
    },
    update: {
      score: opportunity.score,
      priceScore: opportunity.priceScore,
      discountScore: opportunity.discountScore,
      popularityScore: opportunity.popularityScore,
      ratingScore: opportunity.ratingScore,
      historicalScore: opportunity.historicalScore,
      confidence: opportunity.confidence,
      calculatedAt: now,
    },
  });

  return {
    ok: true,
    productId: product.id,
    offerId: offer.id,
    opportunityScore: opportunity.score,
    insufficientHistory: opportunity.insufficientHistory,
    affiliateUrl,
  };
}
