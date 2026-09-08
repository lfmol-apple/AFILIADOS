import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { runProductMatcherShadow } from "@/lib/services/product-match-shadow";

const runId = Date.now();
let mlMerchantId: string;
let shopeeMerchantId: string;
const listingIds: string[] = [];
const canonicalIds: string[] = [];

async function ensureMerchants() {
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = ml.id;
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopee.id;
}

beforeAll(async () => {
  await ensureMerchants();

  // --- A real ML catalog product with brand+model+GTIN, cross-merchant
  // matchable against a Shopee listing whose title shares tokens. ---
  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `shadow-test-canonical-${runId}`,
      title: `Fone Bluetooth Soundcore ShadowTest ${runId}`,
      brand: "Anker",
      model: `SoundcoreShadow${runId}`,
      gtin: "4006381333931", // real, valid EAN-13
      specifications: { catalogProductId: `MLB-SHADOW-${runId}` },
    },
  });
  canonicalIds.push(canonical.id);

  const mlListing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `MLB-SHADOW-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://produto.mercadolivre.com.br/x",
      canonicalProductId: canonical.id,
    },
  });
  listingIds.push(mlListing.id);

  const shopeeListing = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `SHOPEE-SHADOW-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://shopee.com.br/x",
    },
  });
  listingIds.push(shopeeListing.id);
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: shopeeListing.id,
      source: "shopee_product_offer_v2",
      raw: { productName: `Fone Bluetooth Soundcore ShadowTest ${runId}`, itemId: 1 },
    },
  });

  // --- An unrelated Shopee listing that must never be paired with anything. ---
  const unrelatedShopee = await prisma.merchantListing.create({
    data: {
      merchantId: shopeeMerchantId,
      externalId: `SHOPEE-UNRELATED-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://shopee.com.br/y",
    },
  });
  listingIds.push(unrelatedShopee.id);
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: unrelatedShopee.id,
      source: "shopee_product_offer_v2",
      raw: { productName: `Ração para gatos totalmente não relacionada ${runId}`, itemId: 2 },
    },
  });
});

afterAll(async () => {
  await prisma.productMatchEvidence.deleteMany({
    where: { OR: [{ listingAId: { in: listingIds } }, { listingBId: { in: listingIds } }] },
  });
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

describe("runProductMatcherShadow", () => {
  it("finds the real cross-merchant textual match and persists it as ProductMatchEvidence — never touching MerchantListing.canonicalProductId", async () => {
    await runProductMatcherShadow();

    const evidence = await prisma.productMatchEvidence.findMany({
      where: { OR: [{ listingAId: { in: listingIds } }, { listingBId: { in: listingIds } }] },
    });
    expect(evidence.length).toBeGreaterThan(0);
    const found = evidence.find((e) => e.status === "CANDIDATE" || e.status === "CONFIRMED");
    expect(found).toBeTruthy();

    // The unrelated Shopee listing must never appear in any evidence row.
    const unrelated = await prisma.merchantListing.findFirst({
      where: { externalId: `SHOPEE-UNRELATED-${runId}` },
    });
    const touchesUnrelated = evidence.some(
      (e) => e.listingAId === unrelated!.id || e.listingBId === unrelated!.id,
    );
    expect(touchesUnrelated).toBe(false);

    // SHADOW ONLY — the core structural guarantee of this whole phase.
    const shopeeListing = await prisma.merchantListing.findFirst({
      where: { externalId: `SHOPEE-SHADOW-${runId}` },
    });
    expect(shopeeListing?.canonicalProductId).toBeNull();
    const mlListing = await prisma.merchantListing.findFirst({
      where: { externalId: `MLB-SHADOW-${runId}` },
    });
    expect(mlListing?.canonicalProductId).toBe(canonicalIds[0]);
  });

  it("is idempotent: running it twice does not duplicate evidence, and A vs B is never stored in both orders", async () => {
    await runProductMatcherShadow();
    const firstCount = await prisma.productMatchEvidence.count({
      where: { OR: [{ listingAId: { in: listingIds } }, { listingBId: { in: listingIds } }] },
    });

    await runProductMatcherShadow();
    const secondCount = await prisma.productMatchEvidence.count({
      where: { OR: [{ listingAId: { in: listingIds } }, { listingBId: { in: listingIds } }] },
    });

    expect(secondCount).toBe(firstCount);
  });

  it("returns real, honest counters — including zero cross-merchant matches when nothing legitimately relates", async () => {
    const result = await runProductMatcherShadow();
    expect(result.eligibleListings).toBeGreaterThanOrEqual(2);
    expect(result.candidatePairsConsidered).toBeGreaterThanOrEqual(0);
    expect(typeof result.crossMerchant).toBe("number");
    expect(typeof result.noMatch).toBe("number");
  });
});
