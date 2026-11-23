import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import { withRetry, isRetryableError } from "@/lib/jobs/retry";

const runId = Date.now();

afterEach(async () => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

// ---------------------------------------------------------------------
// lib/jobs/retry.ts — pure classification + backoff behavior.
// ---------------------------------------------------------------------
describe("retry.ts — error classification", () => {
  it("classifies 429/5xx and network failures as retryable", () => {
    expect(isRetryableError(new Error("Foo failed: HTTP 429"))).toBe(true);
    expect(isRetryableError(new Error("Foo failed: HTTP 500"))).toBe(true);
    expect(isRetryableError(new Error("Foo failed: HTTP 503"))).toBe(true);
    expect(isRetryableError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableError(new Error("connect ETIMEDOUT 1.2.3.4:443"))).toBe(true);
  });

  it("classifies 401/400/404 and unexpected-schema errors as NOT retryable — a human needs to look, not a loop", () => {
    expect(isRetryableError(new Error("Foo failed: HTTP 401"))).toBe(false);
    expect(isRetryableError(new Error("Foo failed: HTTP 400"))).toBe(false);
    expect(isRetryableError(new Error("Foo failed: HTTP 404"))).toBe(false);
    expect(isRetryableError(new Error("Unexpected token < in JSON at position 0"))).toBe(false);
  });
});

describe("withRetry", () => {
  it("retries a transient failure and succeeds once the underlying call recovers", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("HTTP 503");
        return "ok";
      },
      { baseDelayMs: 1 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gives up after the configured attempt count — never an infinite loop", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error("HTTP 500");
        },
        { attempts: 3, baseDelayMs: 1 },
      ),
    ).rejects.toThrow(/HTTP 500/);
    expect(calls).toBe(3);
  });

  it("never retries a non-retryable error — fails on the first attempt", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls++;
        throw new Error("HTTP 401");
      }),
    ).rejects.toThrow(/HTTP 401/);
    expect(calls).toBe(1);
  });
});

// ---------------------------------------------------------------------
// Shared fixtures for the job-level tests below.
// ---------------------------------------------------------------------
function stubMlCredentials() {
  vi.stubEnv("MERCADO_LIVRE_ENABLED", "true");
  vi.stubEnv("MERCADO_LIVRE_API_ENABLED", "true");
  vi.stubEnv("MERCADO_LIVRE_SITE_ID", "MLB");
}

async function seedMlCredentialRow(accessToken = "test-access-token") {
  await prisma.integrationCredential.upsert({
    where: { provider: "MERCADO_LIVRE" },
    create: {
      provider: "MERCADO_LIVRE",
      accessToken,
      refreshToken: "test-refresh-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
    update: { accessToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
}

function stubShopeeCredentials() {
  vi.stubEnv("SHOPEE_AFFILIATE_ENABLED", "true");
  vi.stubEnv("SHOPEE_AFFILIATE_API_ENABLED", "true");
  vi.stubEnv("SHOPEE_APP_ID", "test-app-id");
  vi.stubEnv("SHOPEE_SECRET_KEY", "test-secret-key-should-never-appear-in-any-run-metadata");
}

async function cleanupMerchantListings(externalIds: string[]) {
  await prisma.merchantListing.deleteMany({ where: { externalId: { in: externalIds } } });
}

// ---------------------------------------------------------------------
// jobs/ml-demand.ts
// ---------------------------------------------------------------------
describe("ML_DEMAND job", () => {
  const catalogId = `MLDEMANDTEST${runId}`;

  afterEach(async () => {
    await cleanupMerchantListings([catalogId]);
    await prisma.automationRun.deleteMany({ where: { job: "ML_DEMAND" } });
    await prisma.integrationCredential.deleteMany({ where: { provider: "MERCADO_LIVRE" } });
  });

  it("collects real trends + highlights and persists a MerchantListing/MonetizationScore idempotently (AutomationRun SUCCESS)", async () => {
    stubMlCredentials();
    await seedMlCredentialRow();

    const fetchSpy = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/trends/")) {
        return { ok: true, status: 200, json: async () => [{ keyword: "capinha" }] };
      }
      if (u.includes("/highlights/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ content: [{ id: catalogId, position: 1, type: "PRODUCT" }] }),
        };
      }
      if (u.includes(`/products/${catalogId}`)) {
        return { ok: true, status: 200, json: async () => ({ name: `Produto Teste ${runId}` }) };
      }
      throw new Error(`Unexpected fetch in test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    vi.doMock("@/lib/config/ml-demand-categories", () => ({
      pickRotationGroup: () => [{ id: "FAKECAT", name: "Fake Category" }],
      ML_GENERAL_SCAN_CATEGORY_GROUPS: [[{ id: "FAKECAT", name: "Fake Category" }]],
    }));
    const { runMlDemandJob } = await import("@/jobs/ml-demand");

    const counters = await runMlDemandJob();
    expect(counters.errors).toBe(0);
    expect(counters.processed).toBe(1);
    expect(counters.created).toBe(1);

    const run = await prisma.automationRun.findFirst({
      where: { job: "ML_DEMAND" },
      orderBy: { startedAt: "desc" },
    });
    expect(run?.status).toBe("SUCCESS");
    expect(run?.finishedAt).not.toBeNull();

    // Never leaks the secret token value into observable AutomationRun metadata.
    expect(JSON.stringify(run?.metadata)).not.toContain("test-access-token");

    const listing = await prisma.merchantListing.findFirst({
      where: { externalId: catalogId },
      include: { monetizationScore: true },
    });
    expect(listing?.monetizationScore?.score).toBeGreaterThan(0);

    // Idempotency: running it again updates the same row, never duplicates it.
    const secondRun = await runMlDemandJob();
    expect(secondRun.created).toBe(0);
    expect(secondRun.updated).toBe(1);
    const listingsAfter = await prisma.merchantListing.findMany({ where: { externalId: catalogId } });
    expect(listingsAfter).toHaveLength(1);
  });

  it("one category failing does not lose another category's real data — run reports PARTIAL, not FAILED", async () => {
    stubMlCredentials();
    await seedMlCredentialRow();

    const goodCat = "GOODCAT";
    const badCat = "BADCAT";
    const goodItem = `MLDEMANDGOOD${runId}`;

    const fetchSpy = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/trends/")) return { ok: true, status: 200, json: async () => [] };
      if (u.includes(`/highlights/MLB/category/${badCat}`)) {
        return { ok: false, status: 401, json: async () => ({}) }; // non-retryable, explicit
      }
      if (u.includes(`/highlights/MLB/category/${goodCat}`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ content: [{ id: goodItem, position: 1, type: "PRODUCT" }] }),
        };
      }
      if (u.includes(`/products/${goodItem}`)) {
        return { ok: true, status: 200, json: async () => ({ name: "Item bom" }) };
      }
      throw new Error(`Unexpected fetch in test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    vi.doMock("@/lib/config/ml-demand-categories", () => ({
      pickRotationGroup: () => [
        { id: badCat, name: "Bad Category" },
        { id: goodCat, name: "Good Category" },
      ],
      ML_GENERAL_SCAN_CATEGORY_GROUPS: [
        [
          { id: badCat, name: "Bad Category" },
          { id: goodCat, name: "Good Category" },
        ],
      ],
    }));
    const { runMlDemandJob } = await import("@/jobs/ml-demand");

    const counters = await runMlDemandJob();
    expect(counters.errors).toBe(1); // the bad category
    expect(counters.processed).toBe(1); // the good category's one item still got through

    const run = await prisma.automationRun.findFirst({
      where: { job: "ML_DEMAND" },
      orderBy: { startedAt: "desc" },
    });
    expect(run?.status).toBe("PARTIAL");

    const goodListing = await prisma.merchantListing.findFirst({ where: { externalId: goodItem } });
    expect(goodListing).not.toBeNull(); // real data from the good category was NOT lost.

    await cleanupMerchantListings([goodItem]);
  });

  // Owner's correction, 2026-11-22 ("Descoberta ampliada, incluindo
  // categorias hoje ausentes" + "Enriquecimento seletivo, com medição
  // real de custo e chamadas de API"). Real root cause confirmed live
  // the same day: ML_DEMAND already discovers real robot-vacuum/coffee-
  // maker/tool/electronics category highlights, but never registered a
  // single one in the CommercialCandidateRegistry — invisible to the
  // Vitrine's own selection no matter how many real matches existed.
  it("registers every real highlight in the CommercialCandidateRegistry (general_market_scan) and enriches it when within the real cost cutoff", async () => {
    stubMlCredentials();
    await seedMlCredentialRow();

    const topItem = `MLDEMANDTOP${runId}`;
    const sellerIdForTop = 777;

    const fetchSpy = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/trends/")) return { ok: true, status: 200, json: async () => [] };
      if (u.includes("/highlights/")) {
        return { ok: true, status: 200, json: async () => ({ content: [{ id: topItem, position: 1, type: "PRODUCT" }] }) };
      }
      if (u.includes(`/products/${topItem}/items`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ item_id: `${topItem}OFFER`, seller_id: sellerIdForTop, price: 499, currency_id: "BRL", condition: "new", shipping: { free_shipping: true } }],
          }),
        };
      }
      if (u.includes(`/products/${topItem}`)) {
        return { ok: true, status: 200, json: async () => ({ id: topItem, name: "Robô Aspirador Teste", pictures: [{ url: "https://x/robo.jpg" }] }) };
      }
      if (u.includes(`/users/${sellerIdForTop}`)) {
        return { ok: true, status: 200, json: async () => ({ nickname: "loja-robos", seller_reputation: { level_id: "5_green", power_seller_status: "platinum" } }) };
      }
      throw new Error(`Unexpected fetch in test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    vi.doMock("@/lib/config/ml-demand-categories", () => ({
      pickRotationGroup: () => [{ id: "MLB5726", name: "Eletrodomésticos" }],
      ML_GENERAL_SCAN_CATEGORY_GROUPS: [[{ id: "MLB5726", name: "Eletrodomésticos" }]],
    }));
    const { runMlDemandJob } = await import("@/jobs/ml-demand");
    const counters = await runMlDemandJob();
    expect(counters.errors).toBe(0);

    // Registered — the real gap this fix closes: a "Eletrodomésticos"
    // highlight is now visible to buildCommercialCandidatePool.
    const registered = await prisma.commercialCandidateRegistry.findFirst({
      where: { externalId: topItem, sourceType: "general_market_scan" },
    });
    expect(registered?.categoryId).toBe("MLB5726");

    // Within the cost cutoff (position 1) and with no prior
    // canonicalProductId — real enrichment ran, so the listing now has a
    // real CanonicalProduct (title/photo came from the real API mock
    // above, never invented).
    const listing = await prisma.merchantListing.findFirst({ where: { externalId: topItem }, include: { canonicalProduct: true } });
    expect(listing?.canonicalProduct?.title).toBe("Robô Aspirador Teste");

    const run = await prisma.automationRun.findFirst({ where: { job: "ML_DEMAND" }, orderBy: { startedAt: "desc" } });
    const enrichment = (run?.metadata as { enrichment?: { attempts: number; skippedBeyondPositionCutoff: number } } | null)?.enrichment;
    expect(enrichment?.attempts).toBe(1);
    expect(enrichment?.skippedBeyondPositionCutoff).toBe(0);

    await prisma.commercialCandidateRegistry.deleteMany({ where: { externalId: { in: [topItem] } } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: `ml-catalog-${topItem}` } });
    await cleanupMerchantListings([topItem, `${topItem}OFFER`]);
  });

  it("registers a highlight beyond the real cost cutoff WITHOUT spending the extra enrichment API calls — selective, not blanket", async () => {
    stubMlCredentials();
    await seedMlCredentialRow();

    const deepItem = `MLDEMANDDEEP${runId}`;

    const fetchSpy = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/trends/")) return { ok: true, status: 200, json: async () => [] };
      if (u.includes("/highlights/")) {
        // Position 11 — one past ENRICHMENT_POSITION_CUTOFF (10).
        return { ok: true, status: 200, json: async () => ({ content: [{ id: deepItem, position: 11, type: "PRODUCT" }] }) };
      }
      // collectRaw() itself still needs to resolve the real title before
      // this highlight can be persisted at all — mocked narrowly (never
      // matching /items or /users below), so if enrichment incorrectly
      // fired for this position, it would hit the explicit throw instead
      // of silently succeeding against this same mock.
      if (u.endsWith(`/products/${deepItem}`)) {
        return { ok: true, status: 200, json: async () => ({ id: deepItem, name: "Ferramenta Teste" }) };
      }
      // Deliberately no mock for /items or /users — if enrichment fired
      // for this one, the test would fail on this unexpected-fetch throw,
      // proving the cutoff actually held.
      throw new Error(`Unexpected fetch in test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    vi.doMock("@/lib/config/ml-demand-categories", () => ({
      pickRotationGroup: () => [{ id: "MLB263532", name: "Ferramentas" }],
      ML_GENERAL_SCAN_CATEGORY_GROUPS: [[{ id: "MLB263532", name: "Ferramentas" }]],
    }));
    const { runMlDemandJob } = await import("@/jobs/ml-demand");
    const counters = await runMlDemandJob();
    expect(counters.errors).toBe(0);

    const registered = await prisma.commercialCandidateRegistry.findFirst({
      where: { externalId: deepItem, sourceType: "general_market_scan" },
    });
    expect(registered).not.toBeNull(); // still registered — discovery itself is never selective, only enrichment is.

    const listing = await prisma.merchantListing.findFirst({ where: { externalId: deepItem } });
    expect(listing?.canonicalProductId).toBeNull(); // no enrichment call was made.

    const run = await prisma.automationRun.findFirst({ where: { job: "ML_DEMAND" }, orderBy: { startedAt: "desc" } });
    const enrichment = (run?.metadata as { enrichment?: { attempts: number; skippedBeyondPositionCutoff: number } } | null)?.enrichment;
    expect(enrichment?.attempts).toBe(0);
    expect(enrichment?.skippedBeyondPositionCutoff).toBe(1);

    await prisma.commercialCandidateRegistry.deleteMany({ where: { externalId: { in: [deepItem] } } });
    await cleanupMerchantListings([deepItem]);
  });
});

// ---------------------------------------------------------------------
// jobs/ml-enrichment.ts
// ---------------------------------------------------------------------
describe("ML_ENRICHMENT job", () => {
  const merchantIdRef = { id: "" };
  const catalogA = `MLENRICHA${runId}`;
  const catalogB = `MLENRICHB${runId}`;
  const offerA = `MLENRICHOFFERA${runId}`;

  beforeEach(async () => {
    const merchant = await prisma.merchant.upsert({
      where: { code: "MERCADO_LIVRE" },
      create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
      update: {},
    });
    merchantIdRef.id = merchant.id;

    for (const externalId of [catalogA, catalogB]) {
      const listing = await prisma.merchantListing.upsert({
        where: { merchantId_marketplace_externalId: { merchantId: merchant.id, marketplace: "BR", externalId } },
        create: {
          merchantId: merchant.id,
          externalId,
          externalIdType: "MERCHANT_PRODUCT_ID",
          marketplace: "BR",
          productUrl: `https://produto.mercadolivre.com.br/${externalId}`,
          source: "MANUAL_VERIFIED",
        },
        update: {},
      });
      await prisma.merchantListingSignal.create({
        data: { merchantListingId: listing.id, source: "mercado_livre_highlights", bestsellerRank: 1 },
      });
    }
  });

  afterEach(async () => {
    await cleanupMerchantListings([catalogA, catalogB, offerA]);
    await prisma.automationRun.deleteMany({ where: { job: "ML_ENRICHMENT" } });
    await prisma.canonicalProduct.deleteMany({ where: { slug: { in: [`ml-catalog-${catalogA}`, `ml-catalog-${catalogB}`] } } });
    await prisma.integrationCredential.deleteMany({ where: { provider: "MERCADO_LIVRE" } });
  });

  it("enriches a real catalog product's real seller offer; one product's real (non-retryable) failure doesn't lose the other's data — PARTIAL", async () => {
    stubMlCredentials();
    await seedMlCredentialRow();

    const fetchSpy = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes(`/products/${catalogB}/items`)) {
        return { ok: false, status: 401, json: async () => ({}) }; // explicit, no retry
      }
      if (u.includes(`/products/${catalogB}`)) {
        return { ok: true, status: 200, json: async () => ({ id: catalogB, name: "Produto B" }) };
      }
      if (u.includes(`/products/${catalogA}/items`)) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                item_id: offerA,
                seller_id: 999,
                price: 100,
                original_price: 150,
                currency_id: "BRL",
                condition: "new",
                shipping: { free_shipping: true },
              },
            ],
          }),
        };
      }
      if (u.includes(`/products/${catalogA}`)) {
        return { ok: true, status: 200, json: async () => ({ id: catalogA, name: "Produto A", pictures: [{ url: "https://x/a.jpg" }] }) };
      }
      if (u.includes("/users/999")) {
        return { ok: true, status: 200, json: async () => ({ nickname: "loja-teste", seller_reputation: { level_id: "5_green", power_seller_status: "platinum" } }) };
      }
      throw new Error(`Unexpected fetch in test: ${u}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { runMlEnrichmentJob } = await import("@/jobs/ml-enrichment");
    const counters = await runMlEnrichmentJob();

    // NOTE: this ambient local database already carries real catalog rows
    // from earlier manual, real runs of scripts/ml-demand-e2e-check.ts —
    // ML_ENRICHMENT (correctly) processes ALL of them, not just this
    // test's two fixtures, so global counters/status aren't asserted here
    // (they'd be flaky against real, pre-existing data this test doesn't
    // own). What's actually under test — this fixture pair's own
    // isolation — is asserted directly below via AutomationRun.metadata
    // and the persisted rows.
    expect(counters.errors).toBeGreaterThanOrEqual(1); // at least catalogB's 401
    expect(counters.created).toBeGreaterThanOrEqual(1); // at least catalogA's one real offer

    const run = await prisma.automationRun.findFirst({ where: { job: "ML_ENRICHMENT" }, orderBy: { startedAt: "desc" } });
    const products = run?.metadata as unknown as { products?: Record<string, unknown> } | null;
    expect(products?.products?.[catalogB]).toMatchObject({ error: expect.stringContaining("HTTP 401") });
    expect(products?.products?.[catalogA]).toMatchObject({ offersCreated: 1 });

    const offer = await prisma.merchantListing.findFirst({
      where: { externalId: offerA },
      include: { monetizationScore: true, signals: true },
    });
    expect(offer).not.toBeNull();
    expect(offer?.monetizationScore?.score).toBeGreaterThan(0);
    const raw = offer?.signals[0]?.raw as { permalinkVerified?: boolean } | undefined;
    expect(raw?.permalinkVerified).toBe(false); // honesty flag preserved, unchanged.
  });
});

// ---------------------------------------------------------------------
// jobs/shopee-refresh.ts
// ---------------------------------------------------------------------
describe("SHOPEE_REFRESH job", () => {
  const itemGood = 700000001 + (runId % 100000);
  const itemBad = 700000002 + (runId % 100000);

  afterEach(async () => {
    await cleanupMerchantListings([String(itemGood), String(itemBad)]);
    await prisma.automationRun.deleteMany({ where: { job: "SHOPEE_REFRESH" } });
  });

  // Real root cause (2026-11-23, "Operação Cérebro Comercial" —
  // corrigir os 3 testes que falham): this fixture predates
  // selectExtraCommissionOffers's real, documented quality bar
  // (AMS_MIN_SALES=500, AMS_MIN_RATING=4.5, AMS_MIN_COMMISSION_BRL=10,
  // and sellerCommissionRate — the "extra commission" itself — must be
  // > 0) and never satisfied it: sales 50 < 500, commission "1.00" < 10,
  // sellerCommissionRate "0.00" is not extra commission at all. The real
  // job was correctly rejecting this fixture at the discovery filter,
  // every time — never reaching link generation, so `created` stayed 0.
  // Not a weaker test: these values make the fixture a genuinely
  // eligible real-world offer, the same bar a real Shopee offer must
  // clear today.
  function offerNode(itemId: number, name: string) {
    return {
      itemId,
      productName: name,
      imageUrl: "https://x/y.jpg",
      productLink: `https://shopee.com.br/product/${itemId}`,
      offerLink: `https://shopee.com.br/product/${itemId}`,
      priceMin: "10.00",
      priceMax: "10.00",
      priceDiscountRate: 10,
      commissionRate: "0.10",
      sellerCommissionRate: "0.05",
      shopeeCommissionRate: "0.10",
      commission: "15.00",
      sales: 1000,
      ratingStar: "4.8",
      shopId: 1,
      shopName: "Loja Teste",
      shopType: [1],
    };
  }

  it("generates a real affiliate link (sub_id1=precocaindo preserved) for a new offer; a second run finds it already known and processes nothing — idempotent by never re-discovering it", async () => {
    stubShopeeCredentials();

    let generateCalls = 0;
    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { query: string };
      if (body.query.includes("productOfferV2")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { productOfferV2: { nodes: [offerNode(itemGood, `Oferta Teste ${runId}`)] } } }),
        };
      }
      if (body.query.includes("generateShortLink")) {
        generateCalls++;
        expect(body.query).toContain('"precocaindo"'); // attribution tag present in the real mutation sent.
        return { ok: true, status: 200, json: async () => ({ data: { generateShortLink: { shortLink: `https://s.shopee.com.br/test-${itemGood}` } } }) };
      }
      throw new Error(`Unexpected GraphQL query in test: ${body.query}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { runShopeeRefreshJob } = await import("@/jobs/shopee-refresh");
    const counters = await runShopeeRefreshJob();
    expect(counters.errors).toBe(0);
    expect(counters.created).toBe(1);
    expect(generateCalls).toBe(1);

    const link = await prisma.affiliateLinkRegistry.findFirst({
      where: { merchantListing: { externalId: String(itemGood) } },
    });
    expect(link?.status).toBe("ACTIVE");
    expect(link?.attributionTag).toBe("precocaindo");

    const run = await prisma.automationRun.findFirst({ where: { job: "SHOPEE_REFRESH" }, orderBy: { startedAt: "desc" } });
    expect(run?.status).toBe("SUCCESS");
    // The secret key must never leak into observable run metadata.
    expect(JSON.stringify(run?.metadata)).not.toContain("test-secret-key-should-never-appear-in-any-run-metadata");

    // Real root cause fixed (2026-11-23): confirmed by reading the real
    // job — `known` (jobs/shopee-refresh.ts) is used ONLY to EXCLUDE an
    // already-known externalId from `selectExtraCommissionOffers`'s
    // result; there is no second path that revisits/refreshes a known
    // offer. SHOPEE_REFRESH is, by design, a pure NEW-offer discovery
    // job (ML's counterpart split is ML_DEMAND discovery vs.
    // ML_REFRESH_LINKED refresh — Shopee has no equivalent refresh job
    // yet). A second run with the same offer already linked finds ZERO
    // new offers and processes nothing — never "reuses" or "updates" it.
    const secondCounters = await runShopeeRefreshJob();
    expect(secondCounters.created).toBe(0);
    expect(secondCounters.updated).toBe(0);
    expect(secondCounters.processed).toBe(0);
    expect(generateCalls).toBe(1); // unchanged — link generation was not called again.
  });

  it("fail-closed: an offer whose link generation fails never gets an ACTIVE AffiliateLinkRegistry row, and other offers in the same run are unaffected", async () => {
    stubShopeeCredentials();

    const fetchSpy = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as { query: string };
      if (body.query.includes("productOfferV2")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: {
              productOfferV2: {
                nodes: [offerNode(itemGood, `Boa ${runId}`), offerNode(itemBad, `Ruim ${runId}`)],
              },
            },
          }),
        };
      }
      if (body.query.includes("generateShortLink")) {
        if (body.query.includes(String(itemBad))) {
          return { ok: false, status: 401, json: async () => ({}) }; // explicit, no retry
        }
        return { ok: true, status: 200, json: async () => ({ data: { generateShortLink: { shortLink: `https://s.shopee.com.br/test-${itemGood}` } } }) };
      }
      throw new Error(`Unexpected GraphQL query in test: ${body.query}`);
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { runShopeeRefreshJob } = await import("@/jobs/shopee-refresh");
    const counters = await runShopeeRefreshJob();
    expect(counters.errors).toBe(1);
    expect(counters.created).toBe(1); // itemGood only

    const run = await prisma.automationRun.findFirst({ where: { job: "SHOPEE_REFRESH" }, orderBy: { startedAt: "desc" } });
    expect(run?.status).toBe("PARTIAL");

    const goodLink = await prisma.affiliateLinkRegistry.findFirst({ where: { merchantListing: { externalId: String(itemGood) } } });
    expect(goodLink?.status).toBe("ACTIVE");

    const badLink = await prisma.affiliateLinkRegistry.findFirst({ where: { merchantListing: { externalId: String(itemBad) } } });
    expect(badLink).toBeNull(); // never a fallback/fake link — fail-closed preserved.
  });
});

// ---------------------------------------------------------------------
// jobs/run-ml-shopee-cycle.ts — locking (mirrors tests/jobs-cycle-lock.test.ts)
// ---------------------------------------------------------------------
describe("ML_SHOPEE_CYCLE lock", () => {
  afterEach(async () => {
    await prisma.automationRun.deleteMany({
      where: {
        job: { in: ["ML_SHOPEE_CYCLE", "ML_DEMAND", "ML_ENRICHMENT", "SHOPEE_REFRESH", "SHOPEE_DEMAND_DRIVEN", "PRODUCT_MATCHER_SHADOW"] },
      },
    });
  });

  it("rejects a second cycle run while the first is still in progress", async () => {
    // Ambient .env has real ML/Shopee credentials configured (matching
    // production), so each step genuinely attempts a network call rather
    // than failing fast on a missing-config check — the mock below adds a
    // deliberate delay so the first cycle is still verifiably RUNNING when
    // the second call races it (same technique tests/jobs-cycle-lock.test.ts
    // relies on the real 13-job Amazon cycle's own natural duration for).
    const fetchSpy = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { ok: false, status: 500, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { runMlShopeeCycle } = await import("@/jobs/run-ml-shopee-cycle");

    const first = runMlShopeeCycle();
    await new Promise((r) => setTimeout(r, 30));

    await expect(runMlShopeeCycle()).rejects.toThrow(/already running/);

    await first;
  }, 30000);

  it("one step failing does not stop the others — the cycle still completes and unlocks", async () => {
    // Every real network call fails the same way (an unusable mock
    // response) — SHOPEE_REFRESH's un-guarded top-level listOffers() call
    // throws straight out of its runJob(), which is the deterministic
    // proof this test needs: that step's real failure must not prevent
    // ML_DEMAND/ML_ENRICHMENT from still running and the outer cycle from
    // still completing (not left RUNNING forever).
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    const { runMlShopeeCycle } = await import("@/jobs/run-ml-shopee-cycle");
    await runMlShopeeCycle();

    const run = await prisma.automationRun.findFirst({ where: { job: "ML_SHOPEE_CYCLE" }, orderBy: { startedAt: "desc" } });
    expect(run?.status).not.toBe("RUNNING");
    expect(run?.finishedAt).not.toBeNull();

    // Real root cause fixed (2026-11-23): this list still checked
    // "ML_DEMAND"/"ML_ENRICHMENT" — removed from ML_SHOPEE_CYCLE on
    // 2026-09-24 (owner's decision, documented in jobs/run-ml-shopee-
    // cycle.ts itself: the ML catalog is now built only from the
    // affiliate panel) and replaced by "ML_REFRESH_LINKED" (added
    // 2026-11-10). The real cycle has run 4 steps since then, never 5 —
    // this test was never updated after either change.
    const stepRuns = await prisma.automationRun.findMany({
      where: { job: { in: ["ML_REFRESH_LINKED", "SHOPEE_REFRESH", "SHOPEE_DEMAND_DRIVEN", "PRODUCT_MATCHER_SHADOW"] } },
      orderBy: { startedAt: "desc" },
      take: 4,
    });
    expect(stepRuns).toHaveLength(4);
    for (const stepRun of stepRuns) expect(stepRun.status).not.toBe("RUNNING");

    const shopeeRun = stepRuns.find((r) => r.job === "SHOPEE_REFRESH");
    expect(shopeeRun?.status).toBe("FAILED"); // its own real, unguarded failure — proves the step's error wasn't silently swallowed either.

    // PRODUCT_MATCHER_SHADOW never calls the network — it only reads
    // whatever the (in this test, entirely failed) collectors left behind
    // — so it still completes as SUCCESS even when every other step fails,
    // proving its failure isolation runs both ways: a collector failing
    // doesn't break the matcher, and the matcher never blocks on them.
    const matcherRun = stepRuns.find((r) => r.job === "PRODUCT_MATCHER_SHADOW");
    expect(matcherRun?.status).toBe("SUCCESS");
  }, 30000);
});
