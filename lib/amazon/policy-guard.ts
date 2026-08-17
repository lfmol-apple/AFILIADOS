import { env } from "@/lib/config/env";

/**
 * Single place where Amazon Associates Program rules become code. Nothing
 * outside this module should decide whether a link, redirect, or disclosure
 * is compliant — see docs/AMAZON_COMPLIANCE.md for the underlying policy
 * checklist this enforces.
 */

// Official Amazon hosts we are allowed to send affiliate traffic to. Never
// add a non-Amazon host here — that would turn /go/amazon into an open
// redirect.
const ALLOWED_AMAZON_HOSTS = ["www.amazon.com.br", "amazon.com.br", "amzn.to"];

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export class AmazonPolicyViolation extends Error {}

export function isValidAsin(asin: string): boolean {
  return ASIN_PATTERN.test(asin);
}

/**
 * Builds a Special Link for a product page. Requires a real Associate tag —
 * refuses to fabricate one. The tag comes only from env, never hardcoded.
 */
export function buildAmazonProductUrl(asin: string): string {
  if (!isValidAsin(asin)) {
    throw new AmazonPolicyViolation(`Invalid ASIN: ${asin}`);
  }
  if (!env.AMAZON_ASSOCIATE_TAG) {
    throw new AmazonPolicyViolation(
      "AMAZON_ASSOCIATE_TAG is not configured; refusing to build an affiliate link without a real tracking ID.",
    );
  }
  const url = new URL(`https://www.amazon.com.br/dp/${asin}`);
  url.searchParams.set("tag", env.AMAZON_ASSOCIATE_TAG);
  return url.toString();
}

/**
 * Validates that a destination URL points at an official Amazon host before
 * it is ever used as a redirect target. This is the only function allowed
 * to authorize /go/amazon redirects.
 */
export function assertAllowedAmazonDestination(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AmazonPolicyViolation(`Not a valid URL: ${rawUrl}`);
  }
  if (url.protocol !== "https:") {
    throw new AmazonPolicyViolation(`Destination must use https: ${rawUrl}`);
  }
  if (!ALLOWED_AMAZON_HOSTS.includes(url.hostname)) {
    throw new AmazonPolicyViolation(
      `Host not allowed for Amazon redirects: ${url.hostname}`,
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
 * Checklist gate for AMAZON_PROVIDER=live (section 72 of the project brief).
 * This only checks what code can verify (config presence, disclosure,
 * guard tests). Contractual/account items must be confirmed by a human and
 * tracked in docs/AMAZON_COMPLIANCE.md.
 */
export function checkLiveActivationReadiness(): LiveActivationCheck[] {
  return [
    {
      key: "associate_tag",
      label: "AMAZON_ASSOCIATE_TAG configurado",
      pass: env.AMAZON_ASSOCIATE_TAG.length > 0,
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
