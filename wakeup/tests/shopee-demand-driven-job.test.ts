import { describe, expect, it, vi, afterEach, afterAll, beforeAll } from "vitest";
import { prisma } from "@/lib/db";

const runId = Date.now();
let mlMerchantId: string;
const canonicalIds: string[] = [];
const listingIds: string[] = [];

function stubShopeeCredentials() {
  vi.stubEnv("SHOPEE_AFFILIATE_ENABLED", "true");
  vi.stubEnv("SHOPEE_AFFILIATE_API_ENABLED", "true");
  vi.stubEnv("SHOPEE_APP_ID", "test-app-id");
  vi.stubEnv("SHOPEE_SECRET_KEY", "test-secret-key");
}

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  mlMerchantId = merchant.id;

  const canonical = await prisma.canonicalProduct.create({
    data: {
      slug: `sdd-job-test-${runId}`,
      title: `Produto SDD Teste ${runId}`,
      brand: "Samsung",
      model: `GalaxyDDTest${runId}`,
    },
  });
  canonicalIds.push(canonical.id);
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId: mlMerchantId,
      externalId: `SDD-JOB-${runId}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://produto.mercadolivre.com.br/x",
      canonicalProductId: canonical.id,
    },
  });
  listingIds.push(listing.id);
  await prisma.monetizationScore.create({
    data: { merchantListingId: listing.id, score: 100, confidence: 0.9, components: {}, reasons: [], missingSignals: [] },
  });
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.canonicalProduct.deleteMany({ where: { id: { in: canonicalIds } } });
});

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  await prisma.automationRun.deleteMany({ where: { job: "SHOPEE_DEMAND_DRIVEN" } });
});

afterEach(async () => {
  await prisma.merchantListing.deleteMany({ where: { externalId: { in: ["700999001", "700999002"] } } });
});

const term = `Samsung GalaxyDDTest${runId}`;

describe("SHOPEE_DEMAND_DRIVEN job", () => {
  it("only persists RELEVANT results — an accessory result for the same real ML term is filtered, never written", async () => {
    stubShopeeCredentials();

    const relevantItemId = 700999001;
    const irrelevantItemId = 700999002;

    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { query: string };
      if (body.query.includes("productOfferV2")) {
        expect(body.query).toContain(term); // the real term is present verbatim in the GraphQL query sent.
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              productOfferV2: {
                nodes: [
                  {
                    itemId: relevantItemId,
                    productName: `Smartphone Samsung GalaxyDDTest${runId} 128GB`,
                    productLink: `https://shopee.com.br/product/${relevantItemId}`,
                    offerLink: `https://shopee.com.br/product/${relevantItemId}`,
                    priceMin: "999.00",
                    priceMax: "999.00",
                    sales: 10,
                    ratingStar: "4.8",
                    shopId: 1,
                    shopName: "Loja Real",
                  },
                  {
                    itemId: irrelevantItemId,
                    productName: `Capa Capinha Película para Samsung GalaxyDDTest${runId}`,
                    productLink: `https://shopee.com.br/product/${irrelevantItemId}`,
                    offerLink: `https://shopee.com.br/product/${irrelevantItemId}`,
                    priceMin: "15.00",
                    priceMax: "15.00",
                    sales: 500,
                    ratingStar: "4.5",
                    shopId: 2,
                    shopName: "Loja Acessórios",
                  },
                ],
              },
            },
          }),
        };
      }
      if (body.query.includes("generateShortLink")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { generateShortLink: { shortLink: `https://s.shopee.com.br/test-${relevantItemId}` } } }),
        };
      }
      throw new Error(`Unexpected GraphQL query: ${body.query}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    vi.doMock("@/lib/services/demand-driven-terms", () => ({
      pickDemandDrivenTerms: async () => [{ term, canonicalProductId: canonicalIds[0] }],
    }));

    const { runShopeeDemandDrivenJob } = await import("@/jobs/shopee-demand-driven");
    const counters = await runShopeeDemandDrivenJob();

    expect(counters.errors).toBe(0);
    expect(counters.created).toBe(1); // only the relevant one.

    const relevantListing = await prisma.merchantListing.findFirst({ where: { externalId: String(relevantItemId) } });
    expect(relevantListing).not.toBeNull();

    const irrelevantListing = await prisma.merchantListing.findFirst({ where: { externalId: String(irrelevantItemId) } });
    expect(irrelevantListing).toBeNull(); // never persisted — filtered by the relevance gate.

    const run = await prisma.automationRun.findFirst({ where: { job: "SHOPEE_DEMAND_DRIVEN" }, orderBy: { startedAt: "desc" } });
    expect(run?.status).toBe("SUCCESS");
    const metadata = run?.metadata as Record<string, unknown> | null;
    expect(metadata?.relevant).toBe(1);
    expect(metadata?.irrelevant).toBe(1);

    // discoverySource tagged on the real persisted signal.
    const signal = await prisma.merchantListingSignal.findFirst({
      where: { merchantListing: { externalId: String(relevantItemId) } },
      orderBy: { observedAt: "desc" },
    });
    expect((signal?.raw as Record<string, unknown> | undefined)?.discoverySource).toBe("shopee_demand_driven");
  });

  it("skips cleanly (SUCCESS, no error) when no eligible ML terms exist yet — not a failure", async () => {
    stubShopeeCredentials();
    vi.stubGlobal("fetch", vi.fn());
    vi.doMock("@/lib/services/demand-driven-terms", () => ({
      pickDemandDrivenTerms: async () => [],
    }));

    const { runShopeeDemandDrivenJob } = await import("@/jobs/shopee-demand-driven");
    const counters = await runShopeeDemandDrivenJob();
    expect(counters.errors).toBe(0);

    const run = await prisma.automationRun.findFirst({ where: { job: "SHOPEE_DEMAND_DRIVEN" }, orderBy: { startedAt: "desc" } });
    expect(run?.status).toBe("SUCCESS");
  });
});
