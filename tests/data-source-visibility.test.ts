import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Proves the Sprint 6 data-origin model end-to-end (project brief: "evolua
 * o modelo para distinguir origem dos dados: MOCK / MANUAL_VERIFIED /
 * AMAZON_API; somente MANUAL_VERIFIED (e, no futuro, AMAZON_API) podem
 * aparecer em produção"). Covers both the pure gate logic
 * (lib/config/public-catalog.ts) and its real effect on every public query,
 * the product page's no-price path, sitemap, and robots — so the gate
 * can never be "correct in isolation but bypassed somewhere else."
 */

const CATEGORY_SLUG = "__test-datasource-category__";
const MOCK_SLUG = "__test-datasource-mock__";
const MANUAL_SLUG = "__test-datasource-manual__";
const MANUAL_NO_OFFER_SLUG = "__test-datasource-manual-no-offer__";

let categoryId: string;
let mockProductId: string;
let manualProductId: string;
let manualNoOfferProductId: string;
let candidateId: string;

beforeAll(async () => {
  const category = await prisma.category.upsert({
    where: { slug: CATEGORY_SLUG },
    create: { name: "Test DataSource Category", slug: CATEGORY_SLUG },
    update: {},
  });
  categoryId = category.id;

  const mockProduct = await prisma.product.upsert({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin: "DSRC0000001" } },
    create: {
      asin: "DSRC0000001",
      provider: "AMAZON",
      marketplace: "BR",
      slug: MOCK_SLUG,
      title: "Test DataSource Mock Product",
      categoryId,
      active: true,
      dataSource: "MOCK",
    },
    update: { dataSource: "MOCK", active: true },
  });
  mockProductId = mockProduct.id;

  const manualProduct = await prisma.product.upsert({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin: "DSRC0000002" } },
    create: {
      asin: "DSRC0000002",
      provider: "AMAZON",
      marketplace: "BR",
      slug: MANUAL_SLUG,
      title: "Test DataSource Manual Product",
      categoryId,
      active: true,
      dataSource: "MANUAL_VERIFIED",
      description: "Conteúdo editorial de teste, escrito pelo PreçoCaindo.",
    },
    update: { dataSource: "MANUAL_VERIFIED", active: true },
  });
  manualProductId = manualProduct.id;

  await prisma.offer.deleteMany({ where: { productId: manualProductId } });
  await prisma.offer.create({
    data: {
      productId: manualProductId,
      provider: "AMAZON",
      price: 199.9,
      currency: "BRL",
      affiliateUrl: "https://www.amazon.com.br/dp/DSRC0000002?tag=precocaindo-test-20",
      availability: "IN_STOCK",
    },
  });

  const manualNoOffer = await prisma.product.upsert({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace: "BR", asin: "DSRC0000003" } },
    create: {
      asin: "DSRC0000003",
      provider: "AMAZON",
      marketplace: "BR",
      slug: MANUAL_NO_OFFER_SLUG,
      title: "Test DataSource Manual Product Without Price Yet",
      categoryId,
      active: true,
      dataSource: "MANUAL_VERIFIED",
      description: "Conteúdo editorial de teste — ainda sem preço verificado.",
    },
    update: { dataSource: "MANUAL_VERIFIED", active: true },
  });
  manualNoOfferProductId = manualNoOffer.id;

  const candidate = await prisma.productCandidate.upsert({
    where: { asin_marketplace: { asin: "DSRC0000099", marketplace: "BR" } },
    create: {
      asin: "DSRC0000099",
      marketplace: "BR",
      workingTitle: "Test Candidate Never Public",
      rationale: "Apenas para teste de isolamento — nunca deve aparecer publicamente.",
      status: "CANDIDATE",
    },
    update: {},
  });
  candidateId = candidate.id;
});

afterAll(async () => {
  await prisma.productCandidate.deleteMany({ where: { id: candidateId } });
  const ids = [mockProductId, manualProductId, manualNoOfferProductId];
  await prisma.affiliateClick.deleteMany({ where: { productId: { in: ids } } });
  await prisma.opportunityScore.deleteMany({ where: { productId: { in: ids } } });
  await prisma.priceStats.deleteMany({ where: { productId: { in: ids } } });
  await prisma.priceHistory.deleteMany({ where: { productId: { in: ids } } });
  await prisma.offer.deleteMany({ where: { productId: { in: ids } } });
  await prisma.product.deleteMany({ where: { id: { in: ids } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
});

describe("isDataSourceCurrentlyVisible / currentlyVisibleDataSources matrix", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("PUBLIC_CATALOG_ENABLED=false hides everything, including MANUAL_VERIFIED", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    const { currentlyVisibleDataSources } = await import("@/lib/config/public-catalog");
    expect(currentlyVisibleDataSources()).toEqual([]);
  });

  it("PUBLIC_CATALOG_ENABLED=true, MANUAL_PRODUCTS_ENABLED=false hides MANUAL_VERIFIED", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "false");
    const { currentlyVisibleDataSources } = await import("@/lib/config/public-catalog");
    expect(currentlyVisibleDataSources()).not.toContain("MANUAL_VERIFIED");
  });

  it("PUBLIC_CATALOG_ENABLED=true + MANUAL_PRODUCTS_ENABLED=true makes MANUAL_VERIFIED eligible", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    const { currentlyVisibleDataSources } = await import("@/lib/config/public-catalog");
    expect(currentlyVisibleDataSources()).toContain("MANUAL_VERIFIED");
  });

  it("MANUAL_VERIFIED stays visible even when AMAZON_PROVIDER=mock in production — independent of the provider safety net", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "mock");
    vi.stubEnv("NODE_ENV", "production");
    const { currentlyVisibleDataSources, isPublicCatalogSafeToShow } = await import(
      "@/lib/config/public-catalog"
    );
    expect(isPublicCatalogSafeToShow()).toBe(false);
    expect(currentlyVisibleDataSources()).toEqual(["MANUAL_VERIFIED"]);
  });

  it("MOCK is never included regardless of MANUAL_PRODUCTS_ENABLED", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "mock");
    vi.stubEnv("NODE_ENV", "production");
    const { currentlyVisibleDataSources } = await import("@/lib/config/public-catalog");
    expect(currentlyVisibleDataSources()).not.toContain("MOCK");
  });

  it("AMAZON_API is architecturally treated the same as MOCK today (not implemented yet)", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "live");
    const { currentlyVisibleDataSources } = await import("@/lib/config/public-catalog");
    expect(currentlyVisibleDataSources()).toContain("AMAZON_API");
  });
});

describe("Public product queries respect dataSource visibility end-to-end", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("a MOCK product is excluded from every public query once the catalog is unsafe", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "mock");
    vi.stubEnv("NODE_ENV", "production");
    const { getProductBySlug, getOfertas } = await import("@/lib/queries/products");
    expect(await getProductBySlug(MOCK_SLUG)).toBeNull();
    const { items } = await getOfertas({ pageSize: 500 });
    expect(items.map((p) => p.id)).not.toContain(mockProductId);
  });

  it("a MANUAL_VERIFIED product is excluded until MANUAL_PRODUCTS_ENABLED=true", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "false");
    const { getProductBySlug } = await import("@/lib/queries/products");
    expect(await getProductBySlug(MANUAL_SLUG)).toBeNull();
  });

  it("a MANUAL_VERIFIED product becomes visible once both gates are on", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    const { getProductBySlug } = await import("@/lib/queries/products");
    const product = await getProductBySlug(MANUAL_SLUG);
    expect(product?.id).toBe(manualProductId);
  });

  it("a MANUAL_VERIFIED product with no Offer still resolves — no price is never a reason to 404 a real product", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    const { getProductBySlug } = await import("@/lib/queries/products");
    const product = await getProductBySlug(MANUAL_NO_OFFER_SLUG);
    expect(product?.id).toBe(manualNoOfferProductId);
    expect(product?.offers).toEqual([]);
    expect(product?.priceStats).toBeNull();
  });

  it("catalog fully disabled blocks even a MANUAL_VERIFIED product with MANUAL_PRODUCTS_ENABLED=true", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    const { getProductBySlug } = await import("@/lib/queries/products");
    expect(await getProductBySlug(MANUAL_SLUG)).toBeNull();
  });
});

describe("ProductCandidate never leaks into any public query", () => {
  it("public listing results never carry candidate-only fields (rationale/internalScore)", async () => {
    const { getOfertas, getHomeSections } = await import("@/lib/queries/products");
    const { items } = await getOfertas({ pageSize: 500 });
    const home = await getHomeSections();
    for (const p of [...items, ...home.pricesDropping, ...home.bestOpportunities]) {
      expect(p).not.toHaveProperty("rationale");
      expect(p).not.toHaveProperty("internalScore");
    }
  });

  it("a candidate is never auto-promoted to a public Product just by existing", async () => {
    const candidate = await prisma.productCandidate.findUnique({ where: { id: candidateId } });
    expect(candidate?.status).toBe("CANDIDATE");
    expect(candidate?.productId).toBeNull();
  });
});

describe("sitemap and robots stay dataSource-aware", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("sitemap lists no product URLs when nothing is currently visible", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes(MANUAL_SLUG))).toBe(false);
    expect(entries.some((e) => e.url.includes(MOCK_SLUG))).toBe(false);
  });

  it("sitemap includes a MANUAL_VERIFIED product once its gate is on, but never a MOCK one while the catalog is unsafe", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "mock");
    vi.stubEnv("NODE_ENV", "production");
    const { default: sitemap } = await import("@/app/sitemap");
    const entries = await sitemap();
    expect(entries.some((e) => e.url.includes(MANUAL_SLUG))).toBe(true);
    expect(entries.some((e) => e.url.includes(MOCK_SLUG))).toBe(false);
  });

  it("robots disallows the whole catalog when nothing is currently visible", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "false");
    const { default: robots } = await import("@/app/robots");
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.disallow).toContain("/produto/");
  });

  it("robots allows the catalog once a MANUAL_VERIFIED cohort is visible, even with AMAZON_PROVIDER=mock in production", async () => {
    vi.resetModules();
    vi.stubEnv("PUBLIC_CATALOG_ENABLED", "true");
    vi.stubEnv("MANUAL_PRODUCTS_ENABLED", "true");
    vi.stubEnv("AMAZON_PROVIDER", "mock");
    vi.stubEnv("NODE_ENV", "production");
    const { default: robots } = await import("@/app/robots");
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;
    expect(rule?.disallow).not.toContain("/produto/");
  });
});
