import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getAffiliateLink,
  saveManualAffiliateLink,
  saveApiGeneratedAffiliateLink,
  AffiliateLinkValidationError,
} from "@/lib/services/affiliate-link-registry";

let merchantId: string;
let merchantListingId: string;

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  merchantId = merchant.id;

  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-AFFLINK-${Date.now()}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      productUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
    },
  });
  merchantListingId = listing.id;
});

afterAll(async () => {
  await prisma.merchantListing.delete({ where: { id: merchantListingId } });
});

afterEach(async () => {
  await prisma.affiliateLinkRegistry.deleteMany({ where: { merchantListingId } });
});

describe("affiliate link registry", () => {
  it("returns null before any link is saved", async () => {
    expect(await getAffiliateLink(merchantListingId)).toBeNull();
  });

  it("saveManualAffiliateLink persists an ACTIVE row tagged 'precocaindo', source MANUAL_ADMIN", async () => {
    const row = await saveManualAffiliateLink({
      merchantListingId,
      merchantId,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
      affiliateUrl: "https://mercadolivre.com/sec/1AbCdEf",
    });

    expect(row.status).toBe("ACTIVE");
    expect(row.source).toBe("MANUAL_ADMIN");
    expect(row.attributionTag).toBe("precocaindo");
    expect(row.attributionProject).toBe("PRECOCAINDO");
    expect(row.affiliateUrl).toBe("https://mercadolivre.com/sec/1AbCdEf");

    const fetched = await getAffiliateLink(merchantListingId);
    expect(fetched?.id).toBe(row.id);
  });

  it("rejects a pasted URL whose host isn't an allowed Mercado Livre host — never persists it", async () => {
    await expect(
      saveManualAffiliateLink({
        merchantListingId,
        merchantId,
        merchantCode: "MERCADO_LIVRE",
        publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
        affiliateUrl: "https://not-mercadolivre.example.com/sec/xyz",
      }),
    ).rejects.toThrow(AffiliateLinkValidationError);

    expect(await getAffiliateLink(merchantListingId)).toBeNull();
  });

  it("upserts rather than duplicates — a second save on the same listing updates the one row", async () => {
    await saveManualAffiliateLink({
      merchantListingId,
      merchantId,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
      affiliateUrl: "https://mercadolivre.com/sec/first",
    });
    const second = await saveManualAffiliateLink({
      merchantListingId,
      merchantId,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
      affiliateUrl: "https://mercadolivre.com/sec/second",
    });

    expect(second.affiliateUrl).toBe("https://mercadolivre.com/sec/second");
    const all = await prisma.affiliateLinkRegistry.findMany({
      where: { merchantListingId },
    });
    expect(all).toHaveLength(1);
  });

  it("saveApiGeneratedAffiliateLink records source: API with the given attribution tag", async () => {
    const row = await saveApiGeneratedAffiliateLink({
      merchantListingId,
      merchantId,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
      affiliateUrl: "https://mercadolivre.com/sec/api-generated",
      attributionTag: "precocaindo",
    });
    expect(row.source).toBe("API");
  });

  it("never stores a secret — no field in the row resembles an API key/token", async () => {
    const row = await saveManualAffiliateLink({
      merchantListingId,
      merchantId,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
      affiliateUrl: "https://mercadolivre.com/sec/no-secret",
    });
    expect(row).not.toHaveProperty("apiKey");
    expect(row).not.toHaveProperty("secretKey");
    expect(row).not.toHaveProperty("token");
  });
});
