import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { MOCK_CATALOG } from "../lib/providers/mock-catalog";
import { slugify } from "../lib/services/slug";
import { calculatePriceStats } from "../lib/services/price-stats";
import { calculateOpportunityScore } from "../lib/services/opportunity-score";

const prisma = new PrismaClient();

/**
 * Seeds ~10 clearly-fictional demo products so the app is fully explorable
 * before real Amazon data exists (project brief section 32). Refuses to run
 * against anything that looks like a production database, since this data
 * must never be mistaken for real prices.
 *
 * Every seeded product is explicitly marketplace: "BR" (project brief
 * Sprint 4 section 11: "Todos os produtos mock existentes devem ficar
 * explicitamente BR"). There is no US mock catalog — MOCK_CATALOG itself
 * is BR-only (see lib/providers/mock-catalog.ts).
 */
const SEED_MARKETPLACE = "BR" as const;
async function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (/precocaindo\.com\.br|prod|production/i.test(databaseUrl)) {
    throw new Error(
      "Refusing to run the demo seed against what looks like a production DATABASE_URL.",
    );
  }

  console.log(
    `Seeding ${MOCK_CATALOG.length} demo products (MOCK data, not real prices)...`,
  );

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  for (const [index, item] of MOCK_CATALOG.entries()) {
    const category = item.categoryName
      ? await prisma.category.upsert({
          where: { slug: slugify(item.categoryName) },
          create: { name: item.categoryName, slug: slugify(item.categoryName) },
          update: {},
        })
      : null;

    const slug = slugify(item.title) || item.asin.toLowerCase();

    // Deterministic-but-varied history per product so the seed demonstrates
    // different scenarios: deep discount, no discount, short history, etc.
    const historyLengths = [60, 45, 30, 90, 20, 15, 10, 5, 2, 75];
    const days = historyLengths[index % historyLengths.length];
    const basePrice = item.offer.originalPrice ?? item.offer.price;

    const history: { price: number; observedAt: Date }[] = [];
    for (let d = days; d >= 1; d -= Math.max(1, Math.floor(days / 12))) {
      const drift = 1 + Math.sin(d + index) * 0.08;
      const price = Math.round(basePrice * drift * 100) / 100;
      history.push({ price, observedAt: new Date(now - d * DAY) });
    }

    const product = await prisma.product.upsert({
      where: {
        provider_marketplace_asin: { provider: "AMAZON", marketplace: SEED_MARKETPLACE, asin: item.asin },
      },
      create: {
        asin: item.asin,
        provider: "AMAZON",
        marketplace: SEED_MARKETPLACE,
        slug,
        title: item.title,
        brand: item.brand,
        description: item.description,
        imageUrl: item.imageUrl,
        categoryId: category?.id,
        specifications: item.specifications,
        rating: item.rating,
        reviewCount: item.reviewCount,
        updatePriority: index < 3 ? "HOT" : index < 7 ? "WARM" : "COLD",
        firstSeenAt: new Date(now - days * DAY),
      },
      update: {
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
        rating: item.rating,
        reviewCount: item.reviewCount,
      },
    });

    await prisma.priceHistory.deleteMany({ where: { productId: product.id } });
    await prisma.priceHistory.createMany({
      data: history.map((h) => ({
        productId: product.id,
        provider: "AMAZON" as const,
        price: h.price,
        observedAt: h.observedAt,
      })),
    });

    await prisma.offer.deleteMany({ where: { productId: product.id } });
    await prisma.offer.create({
      data: {
        productId: product.id,
        provider: "AMAZON",
        price: item.offer.price,
        currency: item.offer.currency,
        originalPrice: item.offer.originalPrice,
        discountPercentage: item.offer.discountPercentage,
        affiliateUrl: item.offer.affiliateUrl,
        availability: item.offer.availability,
        observedAt: new Date(),
      },
    });

    const stats = calculatePriceStats(history, item.offer.price);
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
        calculatedAt: new Date(),
      },
    });

    const score = calculateOpportunityScore({
      currentPrice: item.offer.price,
      listedDiscountPercentage: item.offer.discountPercentage,
      rating: item.rating,
      reviewCount: item.reviewCount,
      availability: item.offer.availability,
      stats,
    });

    await prisma.opportunityScore.upsert({
      where: { productId: product.id },
      create: {
        productId: product.id,
        score: score.score,
        priceScore: score.priceScore,
        discountScore: score.discountScore,
        popularityScore: score.popularityScore,
        ratingScore: score.ratingScore,
        historicalScore: score.historicalScore,
        confidence: score.confidence,
      },
      update: {
        score: score.score,
        priceScore: score.priceScore,
        discountScore: score.discountScore,
        popularityScore: score.popularityScore,
        ratingScore: score.ratingScore,
        historicalScore: score.historicalScore,
        confidence: score.confidence,
        calculatedAt: new Date(),
      },
    });

    console.log(
      `  - ${item.title} (${item.asin}) -> score ${score.score} (${score.label})`,
    );
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
