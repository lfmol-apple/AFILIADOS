import type { CommerceProvider } from "@/types/commerce";
import type { MarketplaceCode } from "@/types/marketplace";
import { env } from "@/lib/config/env";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";
import { MockAmazonProvider } from "./mock-amazon-provider";
import { AmazonProvider } from "./amazon-provider";

const cache = new Map<MarketplaceCode, CommerceProvider>();

/**
 * Selects the active CommerceProvider for one marketplace. Refuses to
 * construct a provider for a disabled marketplace at all — explicitly and
 * immediately, not just when going live (project brief Sprint 4 section 5:
 * "solicitar provider US com AMAZON_US_ENABLED=false deve falhar
 * explicitamente"). There is no fallback from a disabled marketplace to
 * BR, and no fallback from live to mock — a live marketplace with broken
 * credentials fails via AmazonProvider's own constructor, it never
 * silently serves mock data.
 */
export function getCommerceProvider(marketplace: MarketplaceCode): CommerceProvider {
  const config = getAmazonMarketplaceConfig(marketplace);
  if (!config.enabled) {
    throw new Error(
      `Marketplace ${marketplace} is not enabled (AMAZON_${marketplace}_ENABLED=false); ` +
        `refusing to construct a CommerceProvider for it.`,
    );
  }

  let provider = cache.get(marketplace);
  if (!provider) {
    provider =
      env.AMAZON_PROVIDER === "live" ? new AmazonProvider(marketplace) : new MockAmazonProvider(marketplace);
    cache.set(marketplace, provider);
  }
  return provider;
}

export { MockAmazonProvider } from "./mock-amazon-provider";
export { AmazonProvider } from "./amazon-provider";
export { MOCK_CATALOG } from "./mock-catalog";
