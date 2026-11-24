import { describe, expect, it, vi, afterEach } from "vitest";

describe("AmazonPolicyGuard", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rejects building a BR affiliate link without a configured associate tag", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(() => buildAmazonProductUrl("B0MOCK0001", "BR")).toThrow(
      /No associate tag configured/,
    );
  });

  it("builds a valid amazon.com.br special link using the configured BR tag", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    const url = buildAmazonProductUrl("B0MOCK0001", "BR");
    expect(url).toContain("amazon.com.br");
    expect(url).toContain("tag=confirmed-preco-20");
  });

  it("defaults to BR when no marketplace is given (backward compatible call sites)", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(buildAmazonProductUrl("B0MOCK0001")).toContain("amazon.com.br");
  });

  it("rejects an invalid ASIN", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(() => buildAmazonProductUrl("not-an-asin", "BR")).toThrow(
      /Invalid ASIN/,
    );
  });

  it("rejects PETMOL historical tags as PreçoCaindo Special Link tags", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "petmol-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(() => buildAmazonProductUrl("B0MOCK0001", "BR")).toThrow(
      /No associate tag configured/,
    );
  });

  it("refuses to build a US link while AMAZON_US_ENABLED=false, even with a tag set", async () => {
    vi.stubEnv("AMAZON_US_ENABLED", "false");
    vi.stubEnv("AMAZON_US_ASSOCIATE_TAG", "some-us-tag-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(() => buildAmazonProductUrl("B0MOCK0001", "US")).toThrow(
      /not enabled/,
    );
  });

  it("builds a plain US product link before the affiliate tag is operational", async () => {
    vi.stubEnv("AMAZON_US_ENABLED", "false");
    vi.stubEnv("AMAZON_US_ASSOCIATE_TAG", "");
    const { buildAmazonDirectProductUrl } =
      await import("@/lib/amazon/policy-guard");
    const url = buildAmazonDirectProductUrl("B0MOCK0001", "US");
    expect(url).toBe("https://www.amazon.com/dp/B0MOCK0001");
    expect(url).not.toContain("tag=");
  });

  it("allows redirects to amazon.com.br for BR", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination(
        "https://www.amazon.com.br/dp/B0MOCK0001",
        "BR",
      ),
    ).not.toThrow();
  });

  it("rejects redirects to arbitrary hosts for BR (blocks open redirect)", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination("https://evil.example.com/phish", "BR"),
    ).toThrow(/not (allowed|enabled)/);
  });

  it("rejects amazon.com for BR — hosts are marketplace-scoped, not just Amazon-scoped", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination(
        "https://www.amazon.com/dp/B0MOCK0001",
        "BR",
      ),
    ).toThrow();
  });

  it("rejects amazon.com for US while US is disabled", async () => {
    vi.stubEnv("AMAZON_US_ENABLED", "false");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination(
        "https://www.amazon.com/dp/B0MOCK0001",
        "US",
      ),
    ).toThrow(/not enabled/);
  });

  it("would allow amazon.com for US once enabled (architecture ready, not activated)", async () => {
    vi.stubEnv("AMAZON_US_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination(
        "https://www.amazon.com/dp/B0MOCK0001",
        "US",
      ),
    ).not.toThrow();
  });

  it("rejects amzn.to short links for any marketplace — no operational need to accept an unvalidated redirect target", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination("https://amzn.to/abc123", "BR"),
    ).toThrow(/not allowed/);
  });

  it("rejects non-https destinations", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination(
        "http://www.amazon.com.br/dp/B0MOCK0001",
        "BR",
      ),
    ).toThrow();
  });

  it("rejects malformed URLs instead of throwing an unrelated error", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() => assertAllowedAmazonDestination("not a url", "BR")).toThrow(
      /Not a valid URL/,
    );
  });

  it("exposes the disclosure text from configuration, not hardcoded per-component", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_DISCLOSURE", "Texto de teste de divulgação.");
    const { getDisclosureText } = await import("@/lib/amazon/policy-guard");
    expect(getDisclosureText()).toBe("Texto de teste de divulgação.");
  });

  it("flags BR live activation as not ready when required config is missing", async () => {
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_CREATORS_API_KEY", "");
    const { checkLiveActivationReadiness } =
      await import("@/lib/amazon/policy-guard");
    const checks = checkLiveActivationReadiness("BR");
    expect(checks.some((c) => !c.pass)).toBe(true);
  });

  it("flags US live activation as not ready by default (disabled, no tag)", async () => {
    vi.stubEnv("AMAZON_US_ENABLED", "false");
    vi.stubEnv("AMAZON_US_ASSOCIATE_TAG", "");
    const { checkLiveActivationReadiness } =
      await import("@/lib/amazon/policy-guard");
    const checks = checkLiveActivationReadiness("US");
    expect(checks.find((c) => c.key === "enabled")?.pass).toBe(false);
    expect(checks.find((c) => c.key === "associate_tag")?.pass).toBe(false);
  });
});
