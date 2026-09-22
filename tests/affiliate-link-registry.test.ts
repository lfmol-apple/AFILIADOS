import { describe, expect, it, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  getAffiliateLink,
  saveManualAffiliateLink,
  saveManualAffiliateLinkFromCategoryQueue,
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
  await prisma.affiliateLinkRegistry.deleteMany({
    where: { merchantListingId },
  });
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

  it("saveManualAffiliateLinkFromCategoryQueue persists source MANUAL_ADMIN_CATEGORY — distinct from the original queue's MANUAL_ADMIN, so old and new links stay separable in the database for future correction work", async () => {
    const row = await saveManualAffiliateLinkFromCategoryQueue({
      merchantListingId,
      merchantId,
      merchantCode: "MERCADO_LIVRE",
      publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
      affiliateUrl: "https://mercadolivre.com/sec/2CategoryQueue",
    });

    expect(row.status).toBe("ACTIVE");
    expect(row.source).toBe("MANUAL_ADMIN_CATEGORY");
    expect(row.attributionTag).toBe("precocaindo");
    expect(row.affiliateUrl).toBe(
      "https://mercadolivre.com/sec/2CategoryQueue",
    );
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

  it("refuses to save the same manual link on a second product", async () => {
    const other = await prisma.merchantListing.create({
      data: {
        merchantId,
        externalId: `TEST-AFFLINK-OTHER-${Date.now()}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        productUrl: "https://www.mercadolivre.com.br/outro/p/MLB888",
      },
    });
    try {
      await saveManualAffiliateLink({
        merchantListingId,
        merchantId,
        merchantCode: "MERCADO_LIVRE",
        publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
        affiliateUrl: "https://meli.la/DUPLICADO1",
      });
      await expect(
        saveManualAffiliateLink({
          merchantListingId: other.id,
          merchantId,
          merchantCode: "MERCADO_LIVRE",
          publicUrl: other.productUrl,
          affiliateUrl: "https://meli.la/DUPLICADO1",
        }),
      ).rejects.toBeInstanceOf(AffiliateLinkValidationError);
      // saving the SAME link again on the SAME product stays fine
      await expect(
        saveManualAffiliateLink({
          merchantListingId,
          merchantId,
          merchantCode: "MERCADO_LIVRE",
          publicUrl: "https://www.mercadolivre.com.br/produto-teste/p/MLB999",
          affiliateUrl: "https://meli.la/DUPLICADO1",
        }),
      ).resolves.toBeTruthy();
    } finally {
      await prisma.affiliateLinkRegistry.deleteMany({
        where: { merchantListingId: other.id },
      });
      await prisma.merchantListing.delete({ where: { id: other.id } });
    }
  });
});
