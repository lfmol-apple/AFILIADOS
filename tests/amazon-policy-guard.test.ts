import { describe, expect, it, vi, afterEach } from "vitest";

describe("AmazonPolicyGuard", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("rejects building an affiliate link without a configured associate tag", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(() => buildAmazonProductUrl("B0MOCK0001")).toThrow(
      /AMAZON_ASSOCIATE_TAG/,
    );
  });

  it("builds a valid Amazon.com.br special link with the configured tag", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "precocaindo-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    const url = buildAmazonProductUrl("B0MOCK0001");
    expect(url).toContain("amazon.com.br");
    expect(url).toContain("tag=precocaindo-20");
  });

  it("rejects an invalid ASIN", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "precocaindo-20");
    const { buildAmazonProductUrl } = await import("@/lib/amazon/policy-guard");
    expect(() => buildAmazonProductUrl("not-an-asin")).toThrow(/Invalid ASIN/);
  });

  it("allows redirects only to official Amazon hosts", async () => {
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination("https://www.amazon.com.br/dp/B0MOCK0001"),
    ).not.toThrow();
  });

  it("rejects redirects to arbitrary hosts (blocks open redirect)", async () => {
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination("https://evil.example.com/phish"),
    ).toThrow(/not allowed/);
  });

  it("rejects amzn.to short links — no operational need to accept an unvalidated redirect target (Part R)", async () => {
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination("https://amzn.to/abc123"),
    ).toThrow(/not allowed/);
  });

  it("rejects non-https destinations", async () => {
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() =>
      assertAllowedAmazonDestination("http://www.amazon.com.br/dp/B0MOCK0001"),
    ).toThrow();
  });

  it("rejects malformed URLs instead of throwing an unrelated error", async () => {
    const { assertAllowedAmazonDestination } =
      await import("@/lib/amazon/policy-guard");
    expect(() => assertAllowedAmazonDestination("not a url")).toThrow(
      /Not a valid URL/,
    );
  });

  it("exposes the disclosure text from configuration, not hardcoded per-component", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_DISCLOSURE", "Texto de teste de divulgação.");
    const { getDisclosureText } = await import("@/lib/amazon/policy-guard");
    expect(getDisclosureText()).toBe("Texto de teste de divulgação.");
  });

  it("flags live activation as not ready when required config is missing", async () => {
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_CREATORS_API_KEY", "");
    const { checkLiveActivationReadiness } =
      await import("@/lib/amazon/policy-guard");
    const checks = checkLiveActivationReadiness();
    expect(checks.some((c) => !c.pass)).toBe(true);
  });
});
