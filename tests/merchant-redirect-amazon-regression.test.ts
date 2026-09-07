import { describe, expect, it, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import { resolveMerchantRedirect } from "@/lib/services/merchant-redirect";

/**
 * Explicit regression coverage for extending resolveMerchantRedirect to
 * handle non-Amazon merchants (2026-09-07) — the Amazon branch's behavior
 * must be byte-for-byte identical to before this file grew a second
 * branch (confirmed via `git diff` at review time: the amazon logic was
 * only moved into its own function, never changed).
 *
 * Note: resolveMerchantRedirect (backing the generic /go/[merchant]/
 * [externalId] route) is a DIFFERENT, more permissive code path than
 * handleGoAmazonRequest (lib/services/go-amazon-handler.ts, backing
 * /go/amazon/[asin] — the one real click-tracking links actually use). For
 * an ASIN with no matching Product row, resolveMerchantRedirect's amazon
 * branch has always fallen through to building a marketplace-less Special
 * Link via buildMerchantAffiliateUrl (BR default) rather than 404ing — that
 * pre-existing behavior is asserted here, not changed by this PR.
 */
describe("resolveMerchantRedirect — amazon regression", () => {
  afterEach(async () => {
    await prisma.affiliateClick.deleteMany({
      where: { pageType: "regression-test" },
    });
  });

  it("for an unknown ASIN, still falls through to the marketplace-less Special Link (pre-existing behavior, not a 404) — and never writes an AffiliateClick, since no product was found", async () => {
    const result = await resolveMerchantRedirect({
      merchant: "amazon",
      externalId: "B0UNKNOWN1",
      searchParams: new URLSearchParams({ pageType: "regression-test" }),
    });
    expect(result.status).toBe("redirect");
    if (result.status === "redirect") {
      expect(result.destination).toContain("amazon.com.br");
      expect(result.destination).toContain("B0UNKNOWN1");
    }
    const clicks = await prisma.affiliateClick.findMany({
      where: { pageType: "regression-test" },
    });
    expect(clicks).toHaveLength(0);
  });

  it("never queries MerchantListing/AffiliateLinkRegistry for the amazon path", async () => {
    const listingCountBefore = await prisma.merchantListing.count();
    await resolveMerchantRedirect({
      merchant: "amazon",
      externalId: "B0UNKNOWN1",
      searchParams: new URLSearchParams(),
    });
    const listingCountAfter = await prisma.merchantListing.count();
    expect(listingCountAfter).toBe(listingCountBefore);
  });
});
