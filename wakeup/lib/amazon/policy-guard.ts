import { env } from "@/lib/config/env";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

/**
 * Single place where Amazon Associates Program rules become code. Nothing
 * outside this module should decide whether a link, redirect, or disclosure
 * is compliant — see docs/AMAZON_COMPLIANCE.md for the underlying policy
 * checklist this enforces. Every function is marketplace-aware; `marketplace`
 * defaults to "BR" everywhere so existing call sites (written before US was
 * architecturally prepared) keep working unchanged.
 */

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export class AmazonPolicyViolation extends Error {}

export function isValidAsin(asin: string): boolean {
  return ASIN_PATTERN.test(asin);
}

/**
 * Official Amazon hosts allowed as a redirect destination for one
 * marketplace. amzn.to (Amazon's own short-link domain) is deliberately
 * excluded everywhere (project brief Sprint 2 Part R) — PreçoCaindo always
 * builds or stores canonical `<host>/dp/<ASIN>` destinations itself, so
 * there's no operational need to accept a short link whose true target
 * can't be validated before redirecting.
 */
function allowedHostsFor(marketplace: MarketplaceCode): string[] {
  const { host } = getAmazonMarketplaceConfig(marketplace);
  return [host, `www.${host}`];
}

/**
 * Builds a Special Link for a product page on the given marketplace.
 * Requires that marketplace to be enabled AND have a real Associate tag —
 * refuses to fabricate either. The tag comes only from config
 * (lib/config/marketplaces.ts), never hardcoded.
 */
export function buildAmazonProductUrl(
  asin: string,
  marketplace: MarketplaceCode = "BR",
): string {
  if (!isValidAsin(asin)) {
    throw new AmazonPolicyViolation(`Invalid ASIN: ${asin}`);
  }

  const config = getAmazonMarketplaceConfig(marketplace);
  if (!config.enabled) {
    throw new AmazonPolicyViolation(
      `Marketplace ${marketplace} is not enabled; refusing to build an affiliate link for it.`,
    );
  }
  if (!config.associateTag) {
    throw new AmazonPolicyViolation(
      `No associate tag configured for marketplace ${marketplace}; refusing to build an affiliate link without a real tracking ID.`,
    );
  }

  const url = new URL(`https://www.${config.host}/dp/${asin}`);
  url.searchParams.set("tag", config.associateTag);
  return url.toString();
}

/**
 * Builds a plain Amazon product URL, without an Associates tag. This is
 * intentionally NOT a Special Link and earns no commission; it exists for
 * pre-approval editorial pages where the US account/tag is not operational
 * yet but the visitor should still land on the official Amazon detail page.
 */
export function buildAmazonDirectProductUrl(
  asin: string,
  marketplace: MarketplaceCode = "BR",
): string {
  if (!isValidAsin(asin)) {
    throw new AmazonPolicyViolation(`Invalid ASIN: ${asin}`);
  }

  const config = getAmazonMarketplaceConfig(marketplace);
  return `https://www.${config.host}/dp/${asin}`;
}

/**
 * Validates that a destination URL points at an official Amazon host for
 * the given (enabled) marketplace before it is ever used as a redirect
 * target. This is the only function allowed to authorize /go/amazon
 * redirects. Rejects immediately — before even checking the host — when
 * the target marketplace itself isn't enabled, so a disabled marketplace
 * (US, today) can never produce a live redirect regardless of what host
 * the stored/constructed URL happens to use.
 */
export function assertAllowedAmazonDestination(
  rawUrl: string,
  marketplace: MarketplaceCode = "BR",
): URL {
  const config = getAmazonMarketplaceConfig(marketplace);
  if (!config.enabled) {
    throw new AmazonPolicyViolation(
      `Marketplace ${marketplace} is not enabled for redirects.`,
    );
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AmazonPolicyViolation(`Not a valid URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:") {
    throw new AmazonPolicyViolation(`Destination must use https: ${rawUrl}`);
  }
  const allowed = allowedHostsFor(marketplace);
  if (!allowed.includes(url.hostname)) {
    throw new AmazonPolicyViolation(
      `Host not allowed for ${marketplace} Amazon redirects: ${url.hostname} (allowed: ${allowed.join(", ")})`,
    );
  }
  return url;
}

export function getDisclosureText(): string {
  return env.AMAZON_ASSOCIATE_DISCLOSURE;
}

export interface LiveActivationCheck {
  key: string;
  label: string;
  pass: boolean;
}

/**
 * Checklist gate for AMAZON_PROVIDER=live, scoped to one marketplace
 * (section 72 of the original brief; Sprint 2 Part 17/72; Sprint 3 Part 7).
 * Only checks what code can verify (config presence, disclosure, guard
 * tests). Contractual/account items — including Amazon's own eligibility
 * rules for Creators API access (approved Associate account AND at least
 * 10 qualified sales in the trailing 30 days, per Amazon's published FAQ)
 * — must be confirmed by a human; see docs/AMAZON_COMPLIANCE.md and
 * lib/amazon/readiness-checks.ts for the fuller multi-marketplace picture.
 */
export function checkLiveActivationReadiness(
  marketplace: MarketplaceCode = "BR",
): LiveActivationCheck[] {
  const config = getAmazonMarketplaceConfig(marketplace);
  return [
    {
      key: "enabled",
      label: `Marketplace ${marketplace} habilitado (AMAZON_${marketplace}_ENABLED)`,
      pass: config.enabled,
    },
    {
      key: "associate_tag",
      label: `Tracking ID configurado para ${marketplace}`,
      pass: config.associateTag.length > 0,
    },
    {
      key: "creators_api_key",
      label: "AMAZON_CREATORS_API_KEY configurado",
      pass: env.AMAZON_CREATORS_API_KEY.length > 0,
    },
    {
      key: "creators_api_secret",
      label: "AMAZON_CREATORS_API_SECRET configurado",
      pass: env.AMAZON_CREATORS_API_SECRET.length > 0,
    },
    {
      key: "disclosure",
      label: "AMAZON_ASSOCIATE_DISCLOSURE configurado",
      pass: env.AMAZON_ASSOCIATE_DISCLOSURE.length > 0,
    },
    {
      key: "policy_review_recent",
      label: "Revisão de políticas Amazon feita há menos de 90 dias",
      pass: isPolicyReviewRecent(),
    },
  ];
}

export function isPolicyReviewRecent(
  referenceDate: Date = new Date(),
): boolean {
  const reviewDate = new Date(env.AMAZON_POLICY_REVIEW_DATE);
  if (Number.isNaN(reviewDate.getTime())) return false;
  const diffDays =
    (referenceDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 90;
}
