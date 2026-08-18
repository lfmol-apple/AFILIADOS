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

function resolveBrAssociateTag(): string {
  // AMAZON_ASSOCIATE_TAG is the deprecated, pre-multi-marketplace variable
  // — honored as a fallback only so an existing .env keeps working.
  return env.AMAZON_BR_ASSOCIATE_TAG || env.AMAZON_ASSOCIATE_TAG || "";
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
    associateTag: env.AMAZON_US_ASSOCIATE_TAG,
    enabled: env.AMAZON_US_ENABLED,
    apiEnabled: env.AMAZON_US_API_ENABLED,
  };
}

export const ALL_MARKETPLACES: MarketplaceCode[] = ["BR", "US"];

export function isMarketplaceCode(value: string): value is MarketplaceCode {
  return (ALL_MARKETPLACES as string[]).includes(value);
}

export function getEnabledMarketplaces(): MarketplaceCode[] {
  return ALL_MARKETPLACES.filter((m) => getAmazonMarketplaceConfig(m).enabled);
}
