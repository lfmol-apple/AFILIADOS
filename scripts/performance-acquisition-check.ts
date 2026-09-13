/**
 * Performance regression guard for the Acquisition Engine's public
 * surfaces (Home = getPublicRadarFeed + getUnifiedMerchantOffers). This
 * exists because the exact opposite of this script — no scale test at
 * all — is what let an unbounded, N+1 implementation ship and take the
 * Home page from ~4s to 32.6s the moment production's real catalog
 * (tens of thousands of MerchantListing rows) hit it. Never reproduced
 * locally before that deploy because local/dev data never exceeded a few
 * dozen rows.
 *
 * What this proves: query COUNT stays flat as the candidate catalog
 * grows — the actual bug (a query, or several, per candidate row) shows
 * up as query count scaling linearly with data volume, which wall-clock
 * time alone can hide on a fast local Postgres. Creates its own isolated
 * synthetic dataset (prefixed, deleted at the end), separate from the
 * app's shared Prisma client so query-event logging here never affects
 * production code (lib/db.ts's singleton is untouched).
 *
 * Usage: PRISMA_LOG_QUERIES=true npx tsx scripts/performance-acquisition-check.ts
 *
 * PRISMA_LOG_QUERIES must be set before this process starts (lib/db.ts
 * reads it once, at import time) so query counting attaches to the exact
 * same Prisma client getPublicRadarFeed/getUnifiedMerchantOffers use —
 * a separately-constructed client here would silently miss every query.
 */
if (process.env.PRISMA_LOG_QUERIES !== "true") {
  console.error("Run with PRISMA_LOG_QUERIES=true (see this file's usage comment) — query counts would otherwise always read 0.");
  process.exit(1);
}

import { prisma } from "@/lib/db";
import { getPublicRadarFeed } from "@/lib/queries/radar-events";
import { getUnifiedMerchantOffers } from "@/lib/queries/unified-offers";

const RUN_ID = `perf-check-${Date.now()}`;
const ML_CANONICAL_COUNT = 300;
const SHOPEE_LISTING_COUNT = 300;

let queryCount = 0;
prisma.$on("query" as never, () => {
  queryCount += 1;
});

async function seed() {
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });

  console.log(`Seeding synthetic dataset (${RUN_ID}) — this takes a moment...`);

  // --- Mercado Livre: ML_CANONICAL_COUNT canonical products, each with a
  // catalog listing + one real offer sibling (the shape that used to
  // trigger one extra findFirst query PER canonical product). ---
  for (let i = 0; i < ML_CANONICAL_COUNT; i++) {
    const canonical = await prisma.canonicalProduct.create({
      data: { slug: `${RUN_ID}-ml-${i}`, title: `Produto Sintético ML ${i}` },
    });
    const catalogListing = await prisma.merchantListing.create({
      data: {
        merchantId: ml.id,
        externalId: `${RUN_ID}-ML-CATALOG-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://mercadolivre.com.br/${RUN_ID}/${i}`,
        canonicalProductId: canonical.id,
      },
    });
    await prisma.merchantListingSignal.create({
      data: { merchantListingId: catalogListing.id, source: "mercado_livre_highlights", raw: {}, bestsellerRank: (i % 20) + 1 },
    });
    const offerListing = await prisma.merchantListing.create({
      data: {
        merchantId: ml.id,
        externalId: `${RUN_ID}-ML-OFFER-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://mercadolivre.com.br/${RUN_ID}/offer/${i}`,
        canonicalProductId: canonical.id,
      },
    });
    await prisma.merchantListingSignal.createMany({
      data: [
        { merchantListingId: offerListing.id, source: "mercado_livre_catalog_items", raw: { price: 100 + i }, observedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { merchantListingId: offerListing.id, source: "mercado_livre_catalog_items", raw: { price: 90 + i }, observedAt: new Date() },
      ],
    });
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: offerListing.id,
        score: (i % 100) + 1,
        confidence: 0.5,
        components: { offerQuality: { value: 50, quality: "OBSERVED", detail: "synthetic" } },
        reasons: [],
        missingSignals: [],
      },
    });
    // Half of them get an ACTIVE link — mirrors production's real mix of
    // catalog rows with and without a human-generated affiliate link.
    if (i % 2 === 0) {
      await prisma.affiliateLinkRegistry.create({
        data: {
          merchantListingId: catalogListing.id,
          merchantId: ml.id,
          publicUrl: catalogListing.productUrl,
          affiliateUrl: `https://mercadolivre.com/afiliado/${RUN_ID}/${i}`,
          attributionTag: "precocaindo",
          source: "MANUAL_ADMIN",
          status: "ACTIVE",
        },
      });
    }
  }

  // --- Shopee: SHOPEE_LISTING_COUNT flat listings (no N+1 here even
  // before the fix, but still needed to prove the unbounded `findMany`
  // — no `take` at all — doesn't scan/return everything). ---
  for (let i = 0; i < SHOPEE_LISTING_COUNT; i++) {
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: shopee.id,
        externalId: `${RUN_ID}-SHOPEE-${i}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: `https://shopee.com.br/${RUN_ID}/${i}`,
      },
    });
    await prisma.merchantListingSignal.createMany({
      data: [
        { merchantListingId: listing.id, source: "shopee_product_offer_v2", raw: { productName: `Produto Sintético Shopee ${i}`, priceMin: `${100 + i}.00`, rating: 4.9 }, observedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        { merchantListingId: listing.id, source: "shopee_product_offer_v2", raw: { productName: `Produto Sintético Shopee ${i}`, priceMin: `${80 + i}.00`, rating: 4.9 }, observedAt: new Date() },
      ],
    });
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: listing.id,
        score: (i % 100) + 1,
        confidence: 0.5,
        components: { offerQuality: { value: 50, quality: "OBSERVED", detail: "synthetic" } },
        reasons: [],
        missingSignals: [],
      },
    });
    if (i % 2 === 0) {
      await prisma.affiliateLinkRegistry.create({
        data: {
          merchantListingId: listing.id,
          merchantId: shopee.id,
          publicUrl: listing.productUrl,
          affiliateUrl: `https://s.shopee.com.br/${RUN_ID}/${i}`,
          attributionTag: "precocaindo",
          source: "API",
          status: "ACTIVE",
        },
      });
    }
  }

  console.log("Seed complete.");
}

async function cleanup() {
  await prisma.merchantListing.deleteMany({ where: { externalId: { startsWith: RUN_ID } } });
  await prisma.canonicalProduct.deleteMany({ where: { slug: { startsWith: RUN_ID } } });
}

async function measure<T>(label: string, fn: () => Promise<T>): Promise<{ result: T; ms: number; queries: number }> {
  const before = queryCount;
  const start = performance.now();
  const result = await fn();
  const ms = performance.now() - start;
  const queries = queryCount - before;
  console.log(`${label}: ${ms.toFixed(1)}ms, ${queries} quer${queries === 1 ? "y" : "ies"}`);
  return { result, ms, queries };
}

async function main() {
  await seed();

  console.log("\n--- Benchmark ---");
  const radar = await measure("getPublicRadarFeed(20)", () => getPublicRadarFeed(20));
  const offers = await measure("getUnifiedMerchantOffers(24)", () => getUnifiedMerchantOffers(24));
  const combinedStart = performance.now();
  const combinedQueriesBefore = queryCount;
  await Promise.all([getPublicRadarFeed(20), getUnifiedMerchantOffers(24)]);
  const combinedMs = performance.now() - combinedStart;
  const combinedQueries = queryCount - combinedQueriesBefore;

  console.log("\n--- Resultado ---");
  console.log(`Dataset: ${ML_CANONICAL_COUNT} CanonicalProduct (ML) + ${ML_CANONICAL_COUNT * 2} MerchantListing ML + ${SHOPEE_LISTING_COUNT} MerchantListing Shopee`);
  console.log(`Radar: ${radar.ms.toFixed(1)}ms, ${radar.queries} queries, retornou ${radar.result.length} eventos (limite 20)`);
  console.log(`UnifiedOffers: ${offers.ms.toFixed(1)}ms, ${offers.queries} queries, retornou ${offers.result.length} cards (limite 24)`);
  console.log(`Combinado (Home): ${combinedMs.toFixed(1)}ms, ${combinedQueries} queries`);

  const explosive = radar.queries > 20 || offers.queries > 10;
  console.log(`\nComportamento explosivo (queries crescendo com o dataset)? ${explosive ? "SIM — FALHOU" : "NÃO"}`);
  if (radar.result.length > 20) throw new Error(`getPublicRadarFeed(20) retornou ${radar.result.length} > 20`);
  if (offers.result.length > 24) throw new Error(`getUnifiedMerchantOffers(24) retornou ${offers.result.length} > 24`);
  if (explosive) process.exitCode = 1;

  await cleanup();
}

main()
  .catch(async (error) => {
    console.error("Falha no performance check:", error);
    await cleanup().catch(() => {});
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
