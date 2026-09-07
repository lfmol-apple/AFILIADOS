import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getTodaysOpportunities, getOperationsSummary } from "@/lib/queries/operations-center";

let shopeeMerchantId: string;
let mlMerchantId: string;
const listingIds: string[] = [];
const runId = Date.now();

async function makeListing(input: {
  merchantId: string;
  externalId: string;
  score: number;
  linkStatus: "ACTIVE" | "PENDING" | null;
  raw?: object;
}) {
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: input.merchantId,
      externalId: input.externalId,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://example.com/1",
    },
  });
  listingIds.push(listing.id);

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "test",
      raw: input.raw ?? { productName: input.externalId },
    },
  });

  await prisma.monetizationScore.create({
    data: {
      merchantListingId: listing.id,
      score: input.score,
      confidence: 0.8,
      components: {},
      reasons: [],
      missingSignals: [],
    },
  });

  if (input.linkStatus) {
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId: input.merchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: input.linkStatus === "ACTIVE" ? "https://s.shopee.com.br/x" : null,
        attributionTag: "precocaindo",
        source: "API",
        status: input.linkStatus,
      },
    });
  }

  return listing;
}

beforeAll(async () => {
  const shopee = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  shopeeMerchantId = shopee.id;
  const ml = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = ml.id;
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
});

describe("getTodaysOpportunities", () => {
  it("unifies Shopee (ACTIVE link) and Mercado Livre (no link yet) ordered by score desc", async () => {
    const mlPending = await makeListing({
      merchantId: mlMerchantId,
      externalId: `OPS-ML-${runId}`,
      score: 95,
      linkStatus: null,
    });
    const shopeeActive = await makeListing({
      merchantId: shopeeMerchantId,
      externalId: `OPS-SHOPEE-${runId}`,
      score: 80,
      linkStatus: "ACTIVE",
      raw: { productName: "Item Shopee", imageUrl: "https://cf.shopee.com.br/x", priceMin: "49.9" },
    });

    const items = await getTodaysOpportunities(50);
    const filtered = items.filter(
      (i) => i.merchantListingId === mlPending.id || i.merchantListingId === shopeeActive.id,
    );
    expect(filtered.map((i) => i.merchantListingId)).toEqual([mlPending.id, shopeeActive.id]);

    const ml = filtered.find((i) => i.merchantListingId === mlPending.id)!;
    expect(ml.merchant).toBe("MERCADO_LIVRE");
    expect(ml.linkStatus).toBe("PENDING_HUMAN");
    expect(ml.ctaHref).toBeNull();

    const shopee = filtered.find((i) => i.merchantListingId === shopeeActive.id)!;
    expect(shopee.merchant).toBe("SHOPEE");
    expect(shopee.linkStatus).toBe("ACTIVE");
    expect(shopee.imageUrl).toBe("https://cf.shopee.com.br/x");
    expect(shopee.price).toBe(49.9);
    expect(shopee.ctaHref).toBe(
      `/go/shopee/${encodeURIComponent(shopeeActive.externalId)}?pageType=admin&pageSlug=operations&source=operations_center`,
    );
  });
});

describe("getOperationsSummary", () => {
  it("returns only real, non-fabricated counts", async () => {
    const summary = await getOperationsSummary();
    expect(summary.newListingsToday).toBeGreaterThanOrEqual(0);
    expect(summary.activeMerchants.every((c) => ["SHOPEE", "MERCADO_LIVRE"].includes(c))).toBe(
      true,
    );
  });
});
