import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { resolveMerchantRedirect } from "@/lib/services/merchant-redirect";

let merchantId: string;
let listingId: string;
const runId = Date.now();

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  merchantId = merchant.id;

  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-REDIRECT-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://shopee.com.br/product/1/123456",
    },
  });
  listingId = listing.id;
});

afterAll(async () => {
  await prisma.merchantListing.delete({ where: { id: listingId } });
});

afterEach(async () => {
  await prisma.affiliateClick.deleteMany({ where: { merchantListingId: listingId } });
  await prisma.affiliateLinkRegistry.deleteMany({ where: { merchantListingId: listingId } });
});

describe("resolveMerchantRedirect — generic (non-Amazon) merchants", () => {
  it("404s when the listing has no affiliate link at all", async () => {
    const result = await resolveMerchantRedirect({
      merchant: "shopee",
      externalId: `TEST-REDIRECT-${runId}`,
      searchParams: new URLSearchParams(),
    });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.errorStatus).toBe(404);
  });

  it("redirects and records an AffiliateClick (with null productId) once an ACTIVE link exists", async () => {
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listingId,
        merchantId,
        publicUrl: "https://shopee.com.br/product/1/123456",
        affiliateUrl: "https://s.shopee.com.br/testlink123",
        attributionTag: "precocaindo",
        source: "API",
        status: "ACTIVE",
      },
    });

    const result = await resolveMerchantRedirect({
      merchant: "shopee",
      externalId: `TEST-REDIRECT-${runId}`,
      searchParams: new URLSearchParams({ pageType: "ofertas", source: "test" }),
    });

    expect(result.status).toBe("redirect");
    if (result.status === "redirect") {
      expect(result.destination).toBe("https://s.shopee.com.br/testlink123");
    }

    const clicks = await prisma.affiliateClick.findMany({
      where: { merchantListingId: listingId },
    });
    expect(clicks).toHaveLength(1);
    expect(clicks[0]!.productId).toBeNull();
    expect(clicks[0]!.provider).toBe("SHOPEE");
    expect(clicks[0]!.merchantId).toBe(merchantId);
  });

  it("404s (never redirects) when the link exists but isn't ACTIVE", async () => {
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listingId,
        merchantId,
        publicUrl: "https://shopee.com.br/product/1/123456",
        affiliateUrl: "https://s.shopee.com.br/pending",
        attributionTag: "precocaindo",
        source: "API",
        status: "PENDING",
      },
    });

    const result = await resolveMerchantRedirect({
      merchant: "shopee",
      externalId: `TEST-REDIRECT-${runId}`,
      searchParams: new URLSearchParams(),
    });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.errorStatus).toBe(404);
  });

  it("fails closed for merchants with no legitimate provider mapping (awin, generic-affiliate)", async () => {
    const result = await resolveMerchantRedirect({
      merchant: "awin",
      externalId: "anything",
      searchParams: new URLSearchParams(),
    });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.errorStatus).toBe(404);
  });

  it("400s for an unknown merchant code entirely", async () => {
    const result = await resolveMerchantRedirect({
      merchant: "not-a-real-merchant",
      externalId: "anything",
      searchParams: new URLSearchParams(),
    });
    expect(result.status).toBe("error");
    if (result.status === "error") expect(result.errorStatus).toBe(400);
  });
});
