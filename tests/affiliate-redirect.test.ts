import { describe, expect, it } from "vitest";
import { resolveAffiliateRedirect, AffiliateRedirectError } from "@/lib/services/affiliate-redirect";

describe("resolveAffiliateRedirect", () => {
  it("redirects to the known affiliate URL for an active product", () => {
    const url = resolveAffiliateRedirect({
      asin: "B0MOCK0001",
      productActive: true,
      affiliateUrl: "https://www.amazon.com.br/dp/B0MOCK0001?tag=precocaindo-test-20",
    });
    expect(url).toContain("amazon.com.br");
  });

  it("rejects an invalid ASIN with a 400", () => {
    expect(() =>
      resolveAffiliateRedirect({ asin: "invalid", productActive: true, affiliateUrl: null }),
    ).toThrow(AffiliateRedirectError);
  });

  it("rejects an inactive/unknown product with a 404", () => {
    try {
      resolveAffiliateRedirect({ asin: "B0MOCK0001", productActive: false, affiliateUrl: null });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AffiliateRedirectError);
      expect((err as AffiliateRedirectError).status).toBe(404);
    }
  });

  it("never redirects to a non-Amazon host, even if one somehow got stored", () => {
    expect(() =>
      resolveAffiliateRedirect({
        asin: "B0MOCK0001",
        productActive: true,
        affiliateUrl: "https://evil.example.com/phish",
      }),
    ).toThrow();
  });
});
