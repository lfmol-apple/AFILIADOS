import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { handleGoAmazonRequest } from "@/lib/services/go-amazon-handler";

const ASIN = "TESTGOAMZ1";
let productId: string;

beforeAll(async () => {
  const category = await prisma.category.upsert({
    where: { slug: "__test-go-amazon-category__" },
    create: { name: "Test Go Amazon", slug: "__test-go-amazon-category__" },
    update: {},
  });
  const product = await prisma.product.upsert({
    where: { slug: "__test-go-amazon-product__" },
    create: {
      asin: ASIN,
      slug: "__test-go-amazon-product__",
      title: "Test Product for go/amazon",
      categoryId: category.id,
      active: true,
      offers: {
        create: {
          price: 99.9,
          currency: "BRL",
          affiliateUrl:
            "https://www.amazon.com.br/dp/TESTGOAMZ1?tag=precocaindo-test-20",
          availability: "IN_STOCK",
        },
      },
    },
    update: {},
  });
  productId = product.id;
});

afterAll(async () => {
  await prisma.affiliateClick.deleteMany({ where: { productId } });
  await prisma.offer.deleteMany({ where: { productId } });
  await prisma.product.deleteMany({
    where: { slug: "__test-go-amazon-product__" },
  });
  await prisma.category.deleteMany({
    where: { slug: "__test-go-amazon-category__" },
  });
});

describe("handleGoAmazonRequest", () => {
  it("redirects for BR and records a click", async () => {
    const before = await prisma.affiliateClick.count({ where: { productId } });
    const result = await handleGoAmazonRequest(
      "BR",
      ASIN,
      new URLSearchParams(),
    );
    expect(result.status).toBe("redirect");
    if (result.status === "redirect") {
      expect(result.destination).toContain("amazon.com.br");
    }
    const after = await prisma.affiliateClick.count({ where: { productId } });
    expect(after).toBe(before + 1);
  });

  it("refuses US and does not record a click", async () => {
    const before = await prisma.affiliateClick.count({ where: { productId } });
    const result = await handleGoAmazonRequest(
      "US",
      ASIN,
      new URLSearchParams(),
    );
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errorStatus).toBe(404);
    }
    const after = await prisma.affiliateClick.count({ where: { productId } });
    expect(after).toBe(before);
  });

  it("404s for a well-formed but unknown ASIN", async () => {
    const result = await handleGoAmazonRequest(
      "BR",
      "B0UNKNOWN1",
      new URLSearchParams(),
    );
    expect(result.status).toBe("error");
    if (result.status === "error") {
      expect(result.errorStatus).toBe(404);
    }
  });
});
