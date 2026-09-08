import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { pickDemandDrivenTerms } from "@/lib/services/demand-driven-terms";

const runId = Date.now();
const listingIds: string[] = [];
const canonicalIds: string[] = [];

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });

  async function seed(brand: string | null, model: string | null, score: number, suffix: string) {
    const canonical = await prisma.canonicalProduct.create({
      data: {
        slug: `ddt-test-${suffix}-${runId}`,
        title: `Produto Teste ${suffix} ${runId}`,
        brand,
        model,
      },
    });
    canonicalIds.push(canonical.id);
    const listing = await prisma.merchantListing.create({
      data: {
        merchantId: merchant.id,
        externalId: `DDT-${suffix}-${runId}`,
        externalIdType: "MERCHANT_PRODUCT_ID",
        marketplace: "BR",
        productUrl: "https://produto.mercadolivre.com.br/x",
        canonicalProductId: canonical.id,
      },
    });
    listingIds.push(listing.id);
    await prisma.monetizationScore.create({
      data: { merchantListingId: listing.id, score, confidence: 0.8, components: {}, reasons: [], missingSignals: [] },
    });
  }

  await seed("Samsung", `Galaxy A17 ${runId}`, 100, "HIGH");
  await seed("Motorola", `Moto G17 ${runId}`, 80, "MID");
  await seed(null, null, 90, "NOBRAND"); // no brand/model — must never produce a term.
  await seed("", "celular", 70, "GENERIC"); // brand empty -> term reduces to the bare blocklisted word "celular".
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

describe("pickDemandDrivenTerms", () => {
  it("picks real brand+model terms, ordered by real MonetizationScore, highest first", async () => {
    // Ambient local DB carries real ML canonical products from earlier
    // real automation runs — a large limit is used so both this test's
    // fixtures are reachable regardless of how many real, higher-scored
    // products already exist, then only their RELATIVE order is asserted.
    const terms = await pickDemandDrivenTerms(500);
    const highIndex = terms.findIndex((t) => t.term.includes(`Galaxy A17 ${runId}`));
    const midIndex = terms.findIndex((t) => t.term.includes(`Moto G17 ${runId}`));
    expect(highIndex).toBeGreaterThanOrEqual(0);
    expect(midIndex).toBeGreaterThanOrEqual(0);
    expect(highIndex).toBeLessThan(midIndex); // higher score comes first.
  });

  it("never produces a term for a canonical product missing brand or model", async () => {
    const terms = await pickDemandDrivenTerms(500);
    expect(terms.some((t) => t.term.includes("NOBRAND"))).toBe(false);
  });

  it("never produces a generic, blocklisted term even if the underlying brand+model would be one", async () => {
    const terms = await pickDemandDrivenTerms(500);
    expect(terms.some((t) => t.term.trim().toLowerCase() === "celular")).toBe(false);
  });

  it("respects the requested limit", async () => {
    const terms = await pickDemandDrivenTerms(1);
    expect(terms.length).toBeLessThanOrEqual(1);
  });
});
