import {
  isValidAsin,
  buildAmazonProductUrl,
  assertAllowedAmazonDestination,
} from "@/lib/amazon/policy-guard";

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
  productActive: boolean;
  /** Last known offer URL from the provider, when available. Falls back to
   * a freshly built Special Link from the ASIN + configured tag. */
  affiliateUrl: string | null;
}

/**
 * Decides the redirect destination for /go/amazon/[asin]. Never accepts a
 * destination from the request itself (project brief section 66: no open
 * redirect) — the only inputs are what the server already knows about the
 * product plus the AmazonPolicyGuard allowlist.
 */
export function resolveAffiliateRedirect(
  input: AffiliateRedirectInput,
): string {
  if (!isValidAsin(input.asin)) {
    throw new AffiliateRedirectError(`Invalid ASIN: ${input.asin}`, 400);
  }
  if (!input.productActive) {
    throw new AffiliateRedirectError(
      `Product not found or inactive: ${input.asin}`,
      404,
    );
  }

  const destination = input.affiliateUrl ?? buildAmazonProductUrl(input.asin);
  const validated = assertAllowedAmazonDestination(destination);
  return validated.toString();
}
