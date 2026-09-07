import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getMlAffiliateQueue } from "@/lib/queries/ml-affiliate-queue";

let merchantId: string;
const listingIds: string[] = [];
const runId = Date.now();

async function makeListing(input: {
  score: number | null;
  hasActiveLink: boolean;
}) {
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-QUEUE-${runId}-${listingIds.length}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: `https://www.mercadolivre.com.br/produto/${listingIds.length}`,
    },
  });
  listingIds.push(listing.id);

  if (input.score !== null) {
    await prisma.monetizationScore.create({
      data: {
        merchantListingId: listing.id,
        score: input.score,
        confidence: 0.8,
        components: {},
        reasons: [`score de teste ${input.score}`],
        missingSignals: [],
      },
    });
  }

  if (input.hasActiveLink) {
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: "https://mercadolivre.com/sec/already-linked",
        attributionTag: "precocaindo",
        source: "MANUAL_ADMIN",
        status: "ACTIVE",
      },
    });
  }

  return listing;
}

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  merchantId = merchant.id;
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
});

describe("getMlAffiliateQueue", () => {
  it("includes a high-score listing with no affiliate link yet", async () => {
    const listing = await makeListing({ score: 80, hasActiveLink: false });
    const queue = await getMlAffiliateQueue();
    expect(queue.map((i) => i.merchantListingId)).toContain(listing.id);
    const item = queue.find((i) => i.merchantListingId === listing.id);
    expect(item?.monetizationScore).toBe(80);
  });

  it("excludes a listing that already has an ACTIVE affiliate link", async () => {
    const listing = await makeListing({ score: 90, hasActiveLink: true });
    const queue = await getMlAffiliateQueue();
    expect(queue.map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  it("excludes a listing below the minimum score threshold", async () => {
    const listing = await makeListing({ score: 10, hasActiveLink: false });
    const queue = await getMlAffiliateQueue(50);
    expect(queue.map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  it("excludes a listing with no MonetizationScore at all — absence of evidence is not evidence of opportunity", async () => {
    const listing = await makeListing({ score: null, hasActiveLink: false });
    const queue = await getMlAffiliateQueue();
    expect(queue.map((i) => i.merchantListingId)).not.toContain(listing.id);
  });

  it("respects a custom minScore threshold", async () => {
    const listing = await makeListing({ score: 60, hasActiveLink: false });
    expect(
      (await getMlAffiliateQueue(70)).map((i) => i.merchantListingId),
    ).not.toContain(listing.id);
    expect(
      (await getMlAffiliateQueue(50)).map((i) => i.merchantListingId),
    ).toContain(listing.id);
  });
});
