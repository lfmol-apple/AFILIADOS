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

    vi.doMock("@/lib/config/ml-demand-categories", () => ({ ML_DEMAND_CATEGORY_IDS: ["FAKECAT"] }));
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
      ML_DEMAND_CATEGORY_IDS: [badCat, goodCat],
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
      sellerCommissionRate: "0.00",
      shopeeCommissionRate: "0.10",
      commission: "1.00",
      sales: 50,
      ratingStar: "4.5",
      shopId: 1,
      shopName: "Loja Teste",
      shopType: [1],
    };
  }

  it("generates a real affiliate link (sub_id1=precocaindo preserved) for a new offer; a second run reuses it instead of generating again — idempotent", async () => {
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

    // Second run: same offer already has an ACTIVE link -> reused, no second generateShortLink call.
    const secondCounters = await runShopeeRefreshJob();
    expect(secondCounters.updated).toBe(1);
    expect(secondCounters.created).toBe(0);
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
      where: { job: { in: ["ML_SHOPEE_CYCLE", "ML_DEMAND", "ML_ENRICHMENT", "SHOPEE_REFRESH", "PRODUCT_MATCHER_SHADOW"] } },
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

    // Every step still got its own AutomationRun row — the outer cycle
    // recorded, not swallowed, each one, and none is left stuck RUNNING.
    const stepRuns = await prisma.automationRun.findMany({
      where: { job: { in: ["ML_DEMAND", "ML_ENRICHMENT", "SHOPEE_REFRESH", "PRODUCT_MATCHER_SHADOW"] } },
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
