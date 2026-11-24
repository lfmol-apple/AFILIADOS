import { env } from "./env";
import type { MarketplaceCode } from "@/types/marketplace";

export interface AmazonMarketplaceConfig {
  marketplace: MarketplaceCode;
  country: string;
  host: string;
  currency: string;
  /** The operational Special Link tag — empty string means "don't build
   * links for this marketplace yet". Never a Store/Associate ID by itself
   * (see AMAZON_STORE_IDS below for those). */
  associateTag: string;
  enabled: boolean;
  apiEnabled: boolean;
}

/**
 * Store/Associate IDs for the underlying PETMOL Amazon accounts —
 * informational only, never used to build a link or resolved into
 * `associateTag`. petmol-20 is PETMOL's own BR tag (not PreçoCaindo's);
 * petmol07-20 is the new US Associate ID, tied to petmol.com.br, not
 * precocaindo.com.br. See docs/AMAZON.md.
 */
export const AMAZON_STORE_IDS: Record<MarketplaceCode, string> = {
  BR: "petmol-20",
  US: "petmol07-20",
};

const FORBIDDEN_HISTORICAL_TAGS = new Set(Object.values(AMAZON_STORE_IDS));

function normalizeOperationalAssociateTag(value: string): string {
  const tag = value.trim();
  if (!tag) return "";
  return FORBIDDEN_HISTORICAL_TAGS.has(tag) ? "" : tag;
}

function resolveBrAssociateTag(): string {
  // AMAZON_ASSOCIATE_TAG is deprecated and intentionally not used as a
  // fallback for the current PreçoCaindo application. A new Amazon
  // application must have its current Tracking ID confirmed by a human and
  // set explicitly in AMAZON_BR_ASSOCIATE_TAG.
  return normalizeOperationalAssociateTag(env.AMAZON_BR_ASSOCIATE_TAG);
}

/**
 * The single source of truth for "which Amazon marketplace, configured
 * how" — nothing else in the codebase should read the AMAZON_BR_ /
 * AMAZON_US_ env vars directly. See docs/AMAZON.md for the real-world
 * status behind each value.
 */
export function getAmazonMarketplaceConfig(
  marketplace: MarketplaceCode,
): AmazonMarketplaceConfig {
  if (marketplace === "BR") {
    return {
      marketplace: "BR",
      country: "BR",
      host: "amazon.com.br",
      currency: "BRL",
      associateTag: resolveBrAssociateTag(),
      enabled: env.AMAZON_BR_ENABLED,
      apiEnabled: env.AMAZON_BR_API_ENABLED,
    };
  }

  return {
    marketplace: "US",
    country: "US",
    host: "amazon.com",
    currency: "USD",
    // Never falls back to petmol07-20 — see AMAZON_STORE_IDS above.
    associateTag: normalizeOperationalAssociateTag(env.AMAZON_US_ASSOCIATE_TAG),
    enabled: env.AMAZON_US_ENABLED,
    apiEnabled: env.AMAZON_US_API_ENABLED,
  };
}

export const ALL_MARKETPLACES: MarketplaceCode[] = ["BR", "US"];

/**
 * The marketplace the public site serves. Every public query
 * (lib/queries/products.ts, app/sitemap.ts, etc.) filters on this constant
 * explicitly instead of a bare marketplace literal, so switching the
 * deployed property from BR to US is an env change plus reviewed data.
 */
export const PRIMARY_PUBLIC_MARKETPLACE: MarketplaceCode =
  env.PUBLIC_MARKETPLACE;

export function isMarketplaceCode(value: string): value is MarketplaceCode {
  return (ALL_MARKETPLACES as string[]).includes(value);
}

export function getEnabledMarketplaces(): MarketplaceCode[] {
  return ALL_MARKETPLACES.filter((m) => getAmazonMarketplaceConfig(m).enabled);
}
