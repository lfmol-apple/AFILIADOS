import {
  isValidAsin,
  buildAmazonProductUrl,
  assertAllowedAmazonDestination,
} from "@/lib/amazon/policy-guard";
import type { MarketplaceCode } from "@/types/marketplace";

export class AffiliateRedirectError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404,
  ) {
    super(message);
  }
}

export interface AffiliateRedirectInput {
  asin: string;
  /** Defaults to "BR" — the only marketplace with a public redirect flow
   * today. Passing "US" while it's disabled always fails via
   * AmazonPolicyGuard, by construction (see lib/amazon/policy-guard.ts). */
  marketplace?: MarketplaceCode;
  productActive: boolean;
  /** Last known offer URL from the provider, when available. Falls back to
   * a freshly built Special Link from the ASIN + configured tag. */
  affiliateUrl: string | null;
}

/**
 * Decides the redirect destination for /go/amazon/[asin] and
 * /go/amazon/[marketplace]/[asin]. Never accepts a destination from the
 * request itself (project brief section 66: no open redirect) — the only
 * inputs are what the server already knows about the product plus the
 * AmazonPolicyGuard allowlist for that marketplace.
 */
export function resolveAffiliateRedirect(
  input: AffiliateRedirectInput,
): string {
  const marketplace = input.marketplace ?? "BR";

  if (!isValidAsin(input.asin)) {
    throw new AffiliateRedirectError(`Invalid ASIN: ${input.asin}`, 400);
  }
  if (!input.productActive) {
    throw new AffiliateRedirectError(
      `Product not found or inactive: ${input.asin}`,
      404,
    );
  }

  try {
    const destination =
      input.affiliateUrl ?? buildAmazonProductUrl(input.asin, marketplace);
    const validated = assertAllowedAmazonDestination(destination, marketplace);
    return validated.toString();
  } catch {
    // AmazonPolicyViolation here almost always means the marketplace isn't
    // enabled/configured (e.g. US today) — surface it as "not found" rather
    // than leaking guard internals through the redirect endpoint.
    throw new AffiliateRedirectError(
      `Marketplace ${marketplace} is not available for ${input.asin}`,
      404,
    );
  }
}
