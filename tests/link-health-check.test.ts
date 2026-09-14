import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { checkOneLinkHealth } from "@/lib/services/link-health-check";
import type { CommerceProvider, NormalizedProduct } from "@/types/commerce";

let merchantId: string;
const listingIds: string[] = [];
const runId = Date.now();

async function makeActiveLinkListing() {
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-HEALTH-${runId}-${listingIds.length}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: `https://www.mercadolivre.com.br/produto/${listingIds.length}`,
      active: true,
    },
  });
  listingIds.push(listing.id);

  await prisma.affiliateLinkRegistry.create({
    data: {
      merchantListingId: listing.id,
      merchantId,
      publicUrl: listing.productUrl,
      affiliateUrl: "https://mercadolivre.com/sec/test-link",
      attributionTag: "precocaindo",
      source: "MANUAL_ADMIN",
      status: "ACTIVE",
    },
  });

  return listing;
}

function fakeProvider(product: NormalizedProduct | null): CommerceProvider {
  return {
    name: "MERCADO_LIVRE",
    marketplace: "BR",
    async searchProducts() {
      return { products: [], totalResults: 0, page: 1 };
    },
    async getProduct() {
      return product;
    },
    async getProducts() {
      return [];
    },
    async getOffers() {
      return {};
    },
  };
}

function normalizedProduct(availability: "IN_STOCK" | "OUT_OF_STOCK"): NormalizedProduct {
  return {
    asin: "irrelevant",
    provider: "MERCADO_LIVRE",
    title: "Produto de teste",
    offer: {
      price: 100,
      currency: "BRL",
      affiliateUrl: "https://mercadolivre.com/sec/test-link",
      availability,
      observedAt: new Date(),
    },
  };
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

describe("checkOneLinkHealth", () => {
  it("flags INVALID and deactivates the listing when the provider no longer finds the item", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneLinkHealth(fakeProvider(null), listing.id, listing.externalId);
    expect(result).toEqual({ outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" });

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("INVALID");
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(false);
  });

  it("flags INVALID and deactivates the listing when the item is out of stock", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneLinkHealth(
      fakeProvider(normalizedProduct("OUT_OF_STOCK")),
      listing.id,
      listing.externalId,
    );
    expect(result).toEqual({ outcome: "FLAGGED_INVALID", reason: "OUT_OF_STOCK" });

    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(false);
    expect(updated?.availability).toBe("OUT_OF_STOCK");
  });

  it("keeps a genuinely in-stock listing ACTIVE and stamps lastValidatedAt", async () => {
    const listing = await makeActiveLinkListing();
    const before = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });

    const result = await checkOneLinkHealth(
      fakeProvider(normalizedProduct("IN_STOCK")),
      listing.id,
      listing.externalId,
    );
    expect(result).toEqual({ outcome: "STILL_VALID" });

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("ACTIVE");
    expect(link!.lastValidatedAt!.getTime()).toBeGreaterThan(before!.updatedAt.getTime() - 1);
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(true);
  });

  it("never flips a link to INVALID on a transient check failure", async () => {
    const listing = await makeActiveLinkListing();
    const throwingProvider: CommerceProvider = {
      name: "MERCADO_LIVRE",
      marketplace: "BR",
      async searchProducts() {
        return { products: [], totalResults: 0, page: 1 };
      },
      async getProduct(): Promise<NormalizedProduct | null> {
        throw new Error("network blip");
      },
      async getProducts() {
        return [];
      },
      async getOffers() {
        return {};
      },
    };

    const result = await checkOneLinkHealth(throwingProvider, listing.id, listing.externalId);
    expect(result.outcome).toBe("CHECK_FAILED");

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("ACTIVE");
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(true);
  });
});
