import { prisma } from "@/lib/db";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import type { MonetizationScoreInput } from "@/types/monetization";

/**
 * Shared persistence logic for a single Mercado Livre highlight, extracted
 * from scripts/ml-demand-e2e-check.ts (Automação Operacional V1,
 * 2026-09-08) so the manual diagnostic script and the automated job
 * (jobs/ml-demand.ts) run the exact same code — never two copies that can
 * silently drift apart. Behavior is unchanged from the original script.
 */
export async function ensureMercadoLivreMerchant() {
  return prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
}

// Rank 1 (top highlight) -> 100, decaying linearly to a floor of 40 by
// rank 20+ — a highlighted product is never "low demand" (it's already
// among a category's best), so the floor is deliberately not near 0.
export function bestsellerRankToScore(position: number): number {
  return Math.max(40, 100 - (position - 1) * 3);
}

/** Idempotent: MerchantListing is upserted by its unique
 * (merchantId, marketplace, externalId) key — a rerun updates productUrl,
 * never duplicates the row. MerchantListingSignal rows accumulate over
 * time by design (latest wins via observedAt desc), same convention as
 * every other signal source in this codebase. */
export async function persistHighlightSignal(input: {
  merchantId: string;
  itemId: string;
  position: number;
}) {
  const listing = await prisma.merchantListing.upsert({
    where: {
      merchantId_marketplace_externalId: {
        merchantId: input.merchantId,
        marketplace: "BR",
        externalId: input.itemId,
      },
    },
    create: {
      merchantId: input.merchantId,
      externalId: input.itemId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: `https://produto.mercadolivre.com.br/${input.itemId}`,
      source: "MANUAL_VERIFIED",
    },
    update: { productUrl: `https://produto.mercadolivre.com.br/${input.itemId}` },
  });

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "mercado_livre_highlights",
      bestsellerRank: input.position,
    },
  });

  const scoreInput: MonetizationScoreInput = {
    demandSignal: { value: bestsellerRankToScore(input.position), quality: "OBSERVED" },
    commissionSignal: null,
    trendSignal: null,
    historicalConversionSignal: null,
    offerQualitySignal: null,
  };
  const score = calculateMonetizationScore(scoreInput);
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
    },
  });

  return listing;
}
