/**
 * The first real Shopee operational cycle: real API -> real product ->
 * affiliate link tagged 'precocaindo' -> persisted -> ready for the
 * internal redirect to track a click. Manual, human-run — not a job, not
 * wired into jobs/ (project brief: "não sofisticar agora").
 *
 * Usage:
 *   npx tsx scripts/shopee-first-cycle.ts [--top 15] [--min-score 0]
 *
 * Idempotent: re-running upserts the same MerchantListing rows (unique on
 * [merchantId, marketplace, externalId]) and skips affiliate-link
 * generation entirely for any listing that already has an ACTIVE one — no
 * duplicate rows, no wasted generateShortLink calls on a rerun.
 */
import { prisma } from "@/lib/db";
import {
  ShopeeProvider,
  shopeeNumeric,
  type ShopeeProductOfferNode,
} from "@/lib/providers/shopee-provider";
import { calculateMonetizationScore } from "@/lib/services/monetization-score";
import { saveApiGeneratedAffiliateLink } from "@/lib/services/affiliate-link-registry";
import { buildShopeeSubIds } from "@/lib/services/shopee-attribution";
import type { MonetizationScoreInput } from "@/types/monetization";

function parseArgs() {
  const args = process.argv.slice(2);
  let top = 15;
  let minScore = 0;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--top") top = Number(args[++i]);
    if (args[i] === "--min-score") minScore = Number(args[++i]);
  }
  return { top, minScore };
}

// Simple, documented linear mappings from Shopee's own real fields onto our
// 0-100 score scale — the inputs (commissionRate, sales, ratingStar) are
// always real/sourced; only the mapping curve is a judgment call, made
// explicit here rather than hidden inside calculateMonetizationScore.
function commissionToScore(rate: number): number {
  return Math.min(100, Math.round(rate * 100 * 4)); // 25%+ commission -> 100
}
function salesToScore(sales: number): number {
  return Math.min(100, Math.round(Math.log10(sales + 1) * 25));
}
function ratingToScore(rating: number): number {
  return Math.min(100, Math.round((rating / 5) * 100));
}

function scoreOffer(offer: ShopeeProductOfferNode) {
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

async function main() {
  const { top, minScore } = parseArgs();
  const provider = new ShopeeProvider();

  console.log("Buscando ofertas reais (Shopee Affiliate API, productOfferV2)...");
  const offers = await provider.listOffers({ page: 1, limit: 50 });
  console.log(`${offers.length} ofertas reais recebidas.`);

  const merchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true, affiliateEnabled: true },
    update: { affiliateEnabled: true },
  });

  const scored = offers
    .map((offer) => ({ offer, score: scoreOffer(offer) }))
    .filter((x) => (x.score.score ?? 0) >= minScore)
    .sort((a, b) => (b.score.score ?? 0) - (a.score.score ?? 0))
    .slice(0, top);

  console.log(
    `Selecionados ${scored.length} de ${offers.length} (top ${top}, minScore ${minScore}).`,
  );

  let linksGenerated = 0;
  let linksReused = 0;

  for (const { offer, score } of scored) {
    const listing = await prisma.merchantListing.upsert({
      where: {
        merchantId_marketplace_externalId: {
          merchantId: merchant.id,
          marketplace: "BR",
          externalId: String(offer.itemId),
        },
      },
      create: {
        merchantId: merchant.id,
        externalId: String(offer.itemId),
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: offer.productLink,
        // Confirmed real via a live, authenticated API call — not
        // fabricated/demo data, but not hand-typed by a human either.
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
        raw: offer as unknown as object,
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
      linksReused++;
      console.log(`  [reuso] ${offer.productName} — já tem link ativo.`);
      continue;
    }

    const subIds = buildShopeeSubIds({
      source: "first_cycle",
      opportunityId: listing.id,
    });
    const affiliateUrl = await provider.generateAffiliateLink(
      offer.productLink,
      subIds,
    );
    await saveApiGeneratedAffiliateLink({
      merchantListingId: listing.id,
      merchantId: merchant.id,
      merchantCode: "SHOPEE",
      publicUrl: offer.productLink,
      affiliateUrl,
      attributionTag: subIds[0]!,
    });
    linksGenerated++;
    console.log(
      `  [novo] ${offer.productName} — score=${score.score} link=${affiliateUrl}`,
    );
  }

  console.log(
    `\nResumo: ${scored.length} listing(s) processado(s), ${linksGenerated} link(s) novo(s), ${linksReused} reaproveitado(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
