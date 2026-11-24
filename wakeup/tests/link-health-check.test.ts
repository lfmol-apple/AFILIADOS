import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import {
  checkOneMercadoLivreLinkHealth,
  checkOneShopeeLinkHealth,
} from "@/lib/services/link-health-check";
import type { MercadoLivreProvider } from "@/lib/providers/mercado-livre-provider";
import type { ShopeeProvider } from "@/lib/providers/shopee-provider";
import type { NormalizedProduct } from "@/types/commerce";

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

function fakeMlProvider(name: string | null): MercadoLivreProvider {
  return { getCatalogProductName: async () => name } as unknown as MercadoLivreProvider;
}

function fakeShopeeProvider(product: NormalizedProduct | null): ShopeeProvider {
  return { getProduct: async () => product } as unknown as ShopeeProvider;
}

function normalizedProduct(availability: "IN_STOCK" | "OUT_OF_STOCK"): NormalizedProduct {
  return {
    asin: "irrelevant",
    provider: "SHOPEE",
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

describe("checkOneMercadoLivreLinkHealth", () => {
  it("flags INVALID and deactivates the listing when the catalog product no longer exists", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneMercadoLivreLinkHealth(
      fakeMlProvider(null),
      listing.id,
      listing.externalId,
      false,
    );
    expect(result).toEqual({ outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" });

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("INVALID");
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(false);
  });

  it("keeps a listing ACTIVE and stamps lastValidatedAt when the catalog product still resolves", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneMercadoLivreLinkHealth(
      fakeMlProvider("Produto real"),
      listing.id,
      listing.externalId,
      false,
    );
    expect(result).toEqual({ outcome: "STILL_VALID" });

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("ACTIVE");
    expect(link?.lastValidatedAt).not.toBeNull();
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(true);
  });

  it("never flips a link to INVALID on a transient check failure", async () => {
    const listing = await makeActiveLinkListing();
    const throwingProvider = {
      getCatalogProductName: async () => {
        throw new Error("network blip");
      },
    } as unknown as MercadoLivreProvider;

    const result = await checkOneMercadoLivreLinkHealth(
      throwingProvider,
      listing.id,
      listing.externalId,
      false,
    );
    expect(result.outcome).toBe("CHECK_FAILED");

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("ACTIVE");
  });

  it("dry run reports FLAGGED_INVALID but writes nothing", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneMercadoLivreLinkHealth(
      fakeMlProvider(null),
      listing.id,
      listing.externalId,
      true,
    );
    expect(result).toEqual({ outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" });

    const link = await prisma.affiliateLinkRegistry.findUnique({ where: { merchantListingId: listing.id } });
    expect(link?.status).toBe("ACTIVE");
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(true);
  });
});

describe("checkOneShopeeLinkHealth", () => {
  it("flags INVALID when the item is no longer found", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneShopeeLinkHealth(
      fakeShopeeProvider(null),
      listing.id,
      listing.externalId,
      false,
    );
    expect(result).toEqual({ outcome: "FLAGGED_INVALID", reason: "NOT_FOUND" });
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.active).toBe(false);
  });

  it("flags INVALID when out of stock", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneShopeeLinkHealth(
      fakeShopeeProvider(normalizedProduct("OUT_OF_STOCK")),
      listing.id,
      listing.externalId,
      false,
    );
    expect(result).toEqual({ outcome: "FLAGGED_INVALID", reason: "OUT_OF_STOCK" });
    const updated = await prisma.merchantListing.findUnique({ where: { id: listing.id } });
    expect(updated?.availability).toBe("OUT_OF_STOCK");
  });

  it("keeps ACTIVE when in stock", async () => {
    const listing = await makeActiveLinkListing();
    const result = await checkOneShopeeLinkHealth(
      fakeShopeeProvider(normalizedProduct("IN_STOCK")),
      listing.id,
      listing.externalId,
      false,
    );
    expect(result).toEqual({ outcome: "STILL_VALID" });
  });
});
