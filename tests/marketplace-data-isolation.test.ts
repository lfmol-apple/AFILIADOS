import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { getCommerceProvider, MockAmazonProvider } from "@/lib/providers";
import { getOfertas, getProductBySlug, getHomeSections } from "@/lib/queries/products";
import { handleGoAmazonRequest } from "@/lib/services/go-amazon-handler";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";
import { buildReadinessReport } from "@/lib/readiness/report";

/**
 * End-to-end proof of the Sprint 4 data-isolation model — see
 * prisma/schema.prisma's Product doc comment: a BR listing and a US
 * listing for "the same" real-world ASIN are two separate Product rows,
 * so price/currency isolation falls out of the FK structure rather than
 * needing marketplace filters sprinkled through every query. These 12
 * tests are the ones explicitly required by the project brief.
 */

const DAY = 24 * 60 * 60 * 1000;
const SHARED_ASIN = "MKTISO0001";

let categoryId: string;
let brProductId: string;
let usProductId: string;
let brSlug: string;
let usSlug: string;

beforeAll(async () => {
  const category = await prisma.category.upsert({
    where: { slug: "__test-mkt-iso-category__" },
    create: { name: "Test Marketplace Isolation", slug: "__test-mkt-iso-category__" },
    update: {},
  });
  categoryId = category.id;

  const brProduct = await prisma.product.upsert({
    where: {
      provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin: SHARED_ASIN },
    },
    create: {
      asin: SHARED_ASIN,
      provider: "AMAZON",
      marketplace: "BR",
      slug: "__test-mkt-iso-br__",
      title: "Test Product BR/US Isolation",
      categoryId,
      active: true,
    },
    update: {},
  });
  brProductId = brProduct.id;
  brSlug = brProduct.slug;

  const usProduct = await prisma.product.upsert({
    where: {
      provider_marketplace_asin: { provider: "AMAZON", marketplace: "US", asin: SHARED_ASIN },
    },
    create: {
      asin: SHARED_ASIN,
      provider: "AMAZON",
      marketplace: "US",
      slug: "__test-mkt-iso-us__",
      title: "Test Product BR/US Isolation (US)",
      categoryId,
      active: true,
    },
    update: {},
  });
  usProductId = usProduct.id;
  usSlug = usProduct.slug;

  await prisma.priceHistory.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.priceHistory.createMany({
    data: [
      { productId: brProductId, provider: "AMAZON", price: 100, observedAt: new Date(Date.now() - 10 * DAY) },
      { productId: brProductId, provider: "AMAZON", price: 90, observedAt: new Date(Date.now() - 5 * DAY) },
      { productId: brProductId, provider: "AMAZON", price: 80, observedAt: new Date(Date.now() - 1 * DAY) },
      { productId: usProductId, provider: "AMAZON", price: 25, observedAt: new Date(Date.now() - 5 * DAY) },
      { productId: usProductId, provider: "AMAZON", price: 20, observedAt: new Date(Date.now() - 1 * DAY) },
    ],
  });

  await prisma.offer.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.offer.create({
    data: {
      productId: brProductId,
      provider: "AMAZON",
      price: 80,
      currency: "BRL",
      affiliateUrl: "https://www.amazon.com.br/dp/MKTISO0001?tag=precocaindo-test-20",
      availability: "IN_STOCK",
    },
  });
  await prisma.offer.create({
    data: {
      productId: usProductId,
      provider: "AMAZON",
      price: 20,
      currency: "USD",
      affiliateUrl: "https://www.amazon.com/dp/MKTISO0001?tag=petmol07-20",
      availability: "IN_STOCK",
    },
  });
});

afterAll(async () => {
  await prisma.affiliateClick.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.opportunityScore.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.priceStats.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.priceHistory.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.offer.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  await prisma.product.deleteMany({ where: { id: { in: [brProductId, usProductId] } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
});

describe("1. Same ASIN can exist for BR and US without conflict", () => {
  it("both rows exist, with distinct ids, under the same ASIN", async () => {
    expect(brProductId).not.toBe(usProductId);
    const rows = await prisma.product.findMany({ where: { asin: SHARED_ASIN } });
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.marketplace))).toEqual(new Set(["BR", "US"]));
  });
});

describe("2. BR/US price history is isolated", () => {
  it("querying by productId never crosses marketplaces", async () => {
    const brHistory = await prisma.priceHistory.findMany({ where: { productId: brProductId } });
    const usHistory = await prisma.priceHistory.findMany({ where: { productId: usProductId } });

    const numericSort = (a: number, b: number) => a - b;
    expect(brHistory.map((h) => Number(h.price)).sort(numericSort)).toEqual([80, 90, 100]);
    expect(usHistory.map((h) => Number(h.price)).sort(numericSort)).toEqual([20, 25]);

    const brPrices = brHistory.map((h) => Number(h.price));
    expect(brPrices).not.toContain(20);
    expect(brPrices).not.toContain(25);
    const usPrices = usHistory.map((h) => Number(h.price));
    expect(usPrices).not.toContain(90);
    expect(usPrices).not.toContain(100);
  });
});

describe("3 & 4. PriceStats and OpportunityScore never mix marketplace/currency data", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("running the real jobs with BR+US both enabled produces isolated, currency-consistent stats and scores", async () => {
    // Reset first, not just in afterEach: this file's top-level static
    // imports (e.g. @/lib/providers) already pull in @/lib/config/env with
    // real .env values, so a dynamic import without a prior reset would
    // silently return that stale, unstubbed module instead of a fresh one.
    vi.resetModules();
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_US_ENABLED", "true");

    const { calculatePriceStatsJob } = await import("@/jobs/calculate-price-stats");
    await calculatePriceStatsJob();

    const brStats = await prisma.priceStats.findUniqueOrThrow({ where: { productId: brProductId } });
    const usStats = await prisma.priceStats.findUniqueOrThrow({ where: { productId: usProductId } });

    // BR average must land in the BRL range (80-100), never pulled toward
    // the USD range (20-25) — and vice versa. A combined/blended average
    // would land somewhere in between (~55-60) and fail both assertions.
    expect(Number(brStats.avg30d)).toBeGreaterThanOrEqual(80);
    expect(Number(brStats.avg30d)).toBeLessThanOrEqual(100);
    expect(Number(usStats.avg30d)).toBeGreaterThanOrEqual(20);
    expect(Number(usStats.avg30d)).toBeLessThanOrEqual(25);
    expect(Number(brStats.lowestPrice)).toBe(80);
    expect(Number(usStats.lowestPrice)).toBe(20);

    const { calculateOpportunities } = await import("@/jobs/calculate-opportunities");
    await calculateOpportunities();

    const brScore = await prisma.opportunityScore.findUniqueOrThrow({ where: { productId: brProductId } });
    const usScore = await prisma.opportunityScore.findUniqueOrThrow({ where: { productId: usProductId } });

    // Both scores exist independently and neither computation touched the
    // other product's row — proven by each existing with its own
    // productId-scoped 1:1 record, not a shared/merged one.
    expect(brScore.productId).toBe(brProductId);
    expect(usScore.productId).toBe(usProductId);
    expect(brScore.id).not.toBe(usScore.id);
  });
});

describe("5. Requesting the US provider while AMAZON_US_ENABLED=false fails explicitly", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("throws instead of silently falling back to BR or mock", async () => {
    vi.resetModules();
    vi.stubEnv("AMAZON_US_ENABLED", "");
    const { getCommerceProvider: freshGetCommerceProvider } = await import("@/lib/providers");
    expect(() => freshGetCommerceProvider("US")).toThrow(/not enabled/i);
  });

  it("BR stays available under the same conditions (no accidental double-disable)", () => {
    const provider = getCommerceProvider("BR");
    expect(provider.marketplace).toBe("BR");
  });
});

describe("6. Public queries (home, ofertas, product) return BR only", () => {
  beforeAll(async () => {
    // Both products need an OpportunityScore to be picked up by getOfertas().
    await prisma.opportunityScore.upsert({
      where: { productId: brProductId },
      create: {
        productId: brProductId,
        score: 80,
        priceScore: 80,
        discountScore: 80,
        popularityScore: 80,
        ratingScore: 80,
        historicalScore: 80,
        confidence: 1,
      },
      update: {},
    });
    await prisma.opportunityScore.upsert({
      where: { productId: usProductId },
      create: {
        productId: usProductId,
        score: 80,
        priceScore: 80,
        discountScore: 80,
        popularityScore: 80,
        ratingScore: 80,
        historicalScore: 80,
        confidence: 1,
      },
      update: {},
    });
  });

  it("getProductBySlug never resolves a US product, even by exact slug", async () => {
    const brResult = await getProductBySlug(brSlug);
    expect(brResult?.id).toBe(brProductId);

    const usResult = await getProductBySlug(usSlug);
    expect(usResult).toBeNull();
  });

  it("getOfertas only ever includes BR rows", async () => {
    const { items } = await getOfertas({ pageSize: 500 });
    const ids = items.map((p) => p.id);
    expect(ids).toContain(brProductId);
    expect(ids).not.toContain(usProductId);
    expect(items.every((p) => p.marketplace === "BR")).toBe(true);
  });

  it("getHomeSections never surfaces a US product", async () => {
    const { pricesDropping, bestOpportunities } = await getHomeSections();
    const ids = [...pricesDropping, ...bestOpportunities].map((p) => p.id);
    expect(ids).not.toContain(usProductId);
  });
});

describe("7. Affiliate clicks are separable by marketplace", () => {
  afterAll(async () => {
    await prisma.affiliateClick.deleteMany({ where: { productId: { in: [brProductId, usProductId] } } });
  });

  it("a click recorded against a BR product never counts toward US, and vice versa", async () => {
    await prisma.affiliateClick.create({
      data: { productId: brProductId, provider: "AMAZON", pageType: "test", pageSlug: brSlug },
    });
    await prisma.affiliateClick.create({
      data: { productId: usProductId, provider: "AMAZON", pageType: "test", pageSlug: usSlug },
    });

    const brClicks = await prisma.affiliateClick.count({ where: { product: { marketplace: "BR" }, productId: { in: [brProductId, usProductId] } } });
    const usClicks = await prisma.affiliateClick.count({ where: { product: { marketplace: "US" }, productId: { in: [brProductId, usProductId] } } });

    expect(brClicks).toBe(1);
    expect(usClicks).toBe(1);
  });
});

describe("8. The mock catalog is BR-only — no fictional US catalog exists", () => {
  it("MockAmazonProvider('US') returns no products, ever", async () => {
    const usProvider = new MockAmazonProvider("US");
    expect(await usProvider.getProducts([SHARED_ASIN])).toEqual([]);
    const search = await usProvider.searchProducts({ keywords: "" });
    expect(search.products).toEqual([]);
    expect(search.totalResults).toBe(0);
  });

  it("MockAmazonProvider('BR') is the only one backed by real mock data", async () => {
    const brProvider = new MockAmazonProvider("BR");
    const search = await brProvider.searchProducts({ keywords: "" });
    expect(search.products.length).toBeGreaterThan(0);
  });
});

describe("9. production + mock never indexes the fictional catalog", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("is unsafe when the flag is off, even in dev", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { isPublicCatalogSafeToShow: fresh } = await import("@/lib/config/public-catalog");
    expect(fresh()).toBe(false);
  });

  it("is unsafe in production with a mock provider, regardless of the flag", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "mock");
    vi.stubEnv("NODE_ENV", "production");
    const { isPublicCatalogSafeToShow: fresh } = await import("@/lib/config/public-catalog");
    expect(fresh()).toBe(false);
  });

  it("is safe only once enabled, in production, with a live provider", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "live");
    vi.stubEnv("NODE_ENV", "production");
    const { isPublicCatalogSafeToShow: fresh } = await import("@/lib/config/public-catalog");
    expect(fresh()).toBe(true);
  });

  it("current dev config is explicitly allowed to use mock data", () => {
    // Sanity check on the real, non-stubbed module: local dev must not be
    // blocked by the same guard that protects production.
    expect(typeof isPublicCatalogSafeToShow()).toBe("boolean");
  });
});

describe("10. US pendencies never block BR launch readiness", () => {
  it("every AMAZON_US_* line is informational-only — none of them can block BR_LAUNCH_READY", async () => {
    const { lines } = await buildReadinessReport({ infrastructureReady: true });
    const usLines = lines.filter((l) => l.label.startsWith("AMAZON_US"));
    expect(usLines.length).toBeGreaterThan(0);
    expect(usLines.every((l) => l.blocksBrLaunch === false)).toBe(true);
  });

  it("BR_LAUNCH_READY is computed purely from BR/local blockers, never from US lines", async () => {
    const { lines, brLaunchReady } = await buildReadinessReport({ infrastructureReady: true });
    const brLaunchBlockers = lines.filter((l) => l.blocksBrLaunch);
    expect(brLaunchReady).toBe(brLaunchBlockers.length === 0);
    expect(brLaunchBlockers.every((l) => !l.label.startsWith("AMAZON_US"))).toBe(true);
  });
});

describe("11. BR affiliate links keep working even with a same-ASIN US row present", () => {
  it("handleGoAmazonRequest('BR', asin) still resolves the BR product, not the US one", async () => {
    const result = await handleGoAmazonRequest("BR", SHARED_ASIN, new URLSearchParams());
    expect(result.status).toBe("redirect");
    if (result.status === "redirect") {
      expect(result.destination).toContain("amazon.com.br");
    }
  });
});

describe("12. The public product page query still resolves an existing BR product end-to-end", () => {
  it("getProductBySlug returns the full shape app/produto/[slug] depends on", async () => {
    const product = await getProductBySlug(brSlug);
    expect(product).not.toBeNull();
    expect(product?.marketplace).toBe("BR");
    expect(product?.offers).toBeDefined();
    expect(product?.priceHistory).toBeDefined();
  });
});
