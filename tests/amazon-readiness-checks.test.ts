import { describe, expect, it, vi, afterEach } from "vitest";

describe("Amazon readiness checks (BR/US)", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("BR_TRACKING_ID is PENDING until a human-confirmed current tag is configured", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    const { getBrazilReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getBrazilReadinessChecks().find(
      (c) => c.key === "amazon_br_tracking_id",
    );
    expect(check?.value).toBe("PENDING");
  });

  it("BR_TRACKING_ID passes once a current PreçoCaindo tag is configured", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { getBrazilReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getBrazilReadinessChecks().find(
      (c) => c.key === "amazon_br_tracking_id",
    );
    expect(check?.value).toBe("PASS");
  });

  it("BR_TRACKING_ID stays PENDING if someone configures the historical PETMOL tag", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "petmol-20");
    const { getBrazilReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getBrazilReadinessChecks().find(
      (c) => c.key === "amazon_br_tracking_id",
    );
    expect(check?.value).toBe("PENDING");
  });

  it("BR_ACCOUNT_APPROVED is PENDING by default, not FAIL — Amazon's own page still shows the account unapproved", async () => {
    vi.stubEnv("AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED", "");
    const { getBrazilReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getBrazilReadinessChecks().find(
      (c) => c.key === "amazon_br_account_approved",
    );
    expect(check?.value).toBe("PENDING");
    expect(check?.pass).toBe(false);
  });

  it("BR_QUALIFIED_SALES stays PENDING even with real order/click activity — never inferred from panel counts", async () => {
    // No env var represents "13 pedidos" or "29 cliques" at all — the check
    // only ever reads the explicit human-set flag.
    vi.stubEnv("AMAZON_BR_QUALIFIED_SALES_MET", "");
    const { getBrazilReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getBrazilReadinessChecks().find(
      (c) => c.key === "amazon_br_qualified_sales",
    );
    expect(check?.value).toBe("PENDING");
  });

  it("BR_CREATORS_CREDENTIALS requires both key and secret", async () => {
    vi.stubEnv("AMAZON_CREATORS_API_KEY", "some-key");
    vi.stubEnv("AMAZON_CREATORS_API_SECRET", "");
    const { getBrazilReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getBrazilReadinessChecks().find(
      (c) => c.key === "amazon_br_api_credentials",
    );
    expect(check?.value).toBe("PENDING");
  });

  it("all US checks default to PENDING", async () => {
    vi.stubEnv("AMAZON_US_PRECOCAINDO_REGISTERED", "");
    vi.stubEnv("AMAZON_US_PAYMENT_CONFIGURED", "");
    vi.stubEnv("AMAZON_US_ENABLED", "");
    vi.stubEnv("AMAZON_US_API_ENABLED", "");
    const { getUsReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const checks = getUsReadinessChecks();
    expect(checks.every((c) => c.value === "PENDING")).toBe(true);
  });

  it("US_PRECOCAINDO_REGISTERED turns PASS only once a human flips the flag", async () => {
    vi.stubEnv("AMAZON_US_PRECOCAINDO_REGISTERED", "true");
    const { getUsReadinessChecks } =
      await import("@/lib/amazon/readiness-checks");
    const check = getUsReadinessChecks().find(
      (c) => c.key === "amazon_us_precocaindo_registered",
    );
    expect(check?.value).toBe("PASS");
  });
});

describe("Amazon admin status — never exposes secrets", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("getBrazilAmazonStatus never includes the Creators API key/secret values", async () => {
    vi.stubEnv("AMAZON_CREATORS_API_KEY", "super-secret-key-value");
    vi.stubEnv("AMAZON_CREATORS_API_SECRET", "super-secret-secret-value");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { getBrazilAmazonStatus } = await import("@/lib/amazon/status");
    const serialized = JSON.stringify(getBrazilAmazonStatus());
    expect(serialized).not.toContain("super-secret-key-value");
    expect(serialized).not.toContain("super-secret-secret-value");
  });

  it("getBrazilAmazonStatus exposes the tracking tag (a public identifier, not a secret) but no key/secret fields", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { getBrazilAmazonStatus } = await import("@/lib/amazon/status");
    const status = getBrazilAmazonStatus();
    expect(status.trackingId).toBe("confirmed-preco-20");
    expect(Object.keys(status)).not.toContain("creatorsApiKey");
    expect(Object.keys(status)).not.toContain("creatorsApiSecret");
  });

  it("getUsAmazonStatus exposes only booleans and the Store ID, nothing secret", async () => {
    const { getUsAmazonStatus } = await import("@/lib/amazon/status");
    const status = getUsAmazonStatus();
    expect(typeof status.storeId).toBe("string");
    expect(typeof status.precoCaindoRegistered).toBe("boolean");
    expect(typeof status.paymentConfigured).toBe("boolean");
  });
});
