import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getNextAmazonMatchBatch, countPendingAmazonMatches } from "@/lib/queries/amazon-match-queue";
import { recordAmazonMatchDecision } from "@/lib/services/amazon-match";

const runId = Date.now();
let merchantId: string;
let categoryId: string;
let canonicalId: string;
let listingAId: string;
let listingBId: string;
const asin = `B0TEST${runId}`.slice(0, 10).toUpperCase();

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  merchantId = merchant.id;

  const category = await prisma.category.upsert({
    where: { slug: `test-category-${runId}` },
    create: { name: "Categoria de teste", slug: `test-category-${runId}` },
    update: {},
  });
  categoryId = category.id;

  canonicalId = (
    await prisma.canonicalProduct.create({
      data: { slug: `test-canonical-${runId}`, title: `Produto de teste ${runId}`, categoryId },
    })
  ).id;

  const listingA = await prisma.merchantListing.create({
    data: {
      merchantId,
      canonicalProductId: canonicalId,
      externalId: `TEST-AMZMATCH-A-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://mercadolivre.com.br/produto/a",
    },
  });
  listingAId = listingA.id;
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: listingAId,
      merchantId,
      publicUrl: "https://mercadolivre.com.br/produto/a",
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
      affiliateUrl: "https://mercadolivre.com.br/sec/abc",
    },
  });

  const listingB = await prisma.merchantListing.create({
    data: {
      merchantId,
      canonicalProductId: canonicalId,
      externalId: `TEST-AMZMATCH-B-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://mercadolivre.com.br/produto/b",
    },
  });
  listingBId = listingB.id;
  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: listingBId,
      merchantId,
      publicUrl: "https://mercadolivre.com.br/produto/b",
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
      affiliateUrl: "https://mercadolivre.com.br/sec/def",
    },
  });
});

afterAll(async () => {
  await prisma.amazonMatch.deleteMany({
    where: { merchantListingId: { in: [listingAId, listingBId] } },
  });
  await prisma.affiliateLinkRegistry.deleteMany({
    where: { merchantListingId: { in: [listingAId, listingBId] } },
  });
  await prisma.merchantListing.deleteMany({
    where: { id: { in: [listingAId, listingBId] } },
  });
  await prisma.product.deleteMany({ where: { asin } });
  await prisma.canonicalProduct.delete({ where: { id: canonicalId } });
  await prisma.category.delete({ where: { id: categoryId } });
});

describe("Amazon matching queue + decisions", () => {
  it("an active, linked listing with no decision yet shows up in the queue", async () => {
    const batch = await getNextAmazonMatchBatch(50);
    expect(batch.some((r) => r.merchantListingId === listingAId)).toBe(true);
    expect(batch.some((r) => r.merchantListingId === listingBId)).toBe(true);
  });

  it("NO_MATCH records the decision and removes the listing from the queue", async () => {
    const before = await countPendingAmazonMatches();
    const result = await recordAmazonMatchDecision({
      merchantListingId: listingAId,
      decision: "NO_MATCH",
    });
    expect(result.ok).toBe(true);

    const after = await countPendingAmazonMatches();
    expect(after).toBe(before - 1);

    const batch = await getNextAmazonMatchBatch(50);
    expect(batch.some((r) => r.merchantListingId === listingAId)).toBe(false);
  });

  it("the same listing can never be decided twice", async () => {
    const result = await recordAmazonMatchDecision({
      merchantListingId: listingAId,
      decision: "NO_MATCH",
    });
    expect(result.ok).toBe(false);
  });

  it("MATCHED creates a real, active, MANUAL_VERIFIED Product — never price/image — and removes the listing from the queue", async () => {
    const result = await recordAmazonMatchDecision({
      merchantListingId: listingBId,
      decision: "MATCHED",
      asin,
      title: "Produto de teste na Amazon",
      categorySlug: `test-category-${runId}`,
      description: "Também disponível na Amazon.com.br — descrição editorial de teste.",
    });
    expect(result.ok).toBe(true);

    const product = await prisma.product.findUnique({
      where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin } },
    });
    expect(product?.dataSource).toBe("MANUAL_VERIFIED");
    expect(product?.active).toBe(true);

    const match = await prisma.amazonMatch.findUnique({ where: { merchantListingId: listingBId } });
    expect(match?.status).toBe("MATCHED");
    expect(match?.amazonProductId).toBe(product?.id);

    const batch = await getNextAmazonMatchBatch(50);
    expect(batch.some((r) => r.merchantListingId === listingBId)).toBe(false);
  });
});
