import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import type { MarketplaceCode } from "@/types/marketplace";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";
import { logger } from "@/lib/observability/logger";

/**
 * Real Amazon integration via the Creators API, scoped to one marketplace.
 * NOT implemented yet: doing so requires confirmed API access and the
 * official request/auth spec for that marketplace (see docs/AMAZON.md).
 * This class exists so the rest of the system can depend on
 * `CommerceProvider` today and switch to a live implementation later purely
 * via AMAZON_PROVIDER=live + AMAZON_<CC>_ENABLED, without touching call
 * sites.
 *
 * Intentionally has no scraping fallback: if the API call cannot be made,
 * every method fails loudly instead of guessing. A US instance failing to
 * construct (no account ready) must never fall back to BR credentials or
 * data.
 */
export class AmazonProvider implements CommerceProvider {
  readonly name = "AMAZON" as const;
  readonly marketplace: MarketplaceCode;

  constructor(marketplace: MarketplaceCode) {
    const config = getAmazonMarketplaceConfig(marketplace);
    if (!config.enabled) {
      throw new Error(
        `AmazonProvider(${marketplace}) requires AMAZON_${marketplace}_ENABLED=true. ` +
          `Set AMAZON_PROVIDER=mock or enable this marketplace once its account is ready. ` +
          `See docs/AMAZON.md.`,
      );
    }
    if (!config.apiEnabled) {
      throw new Error(
        `AmazonProvider(${marketplace}) requires AMAZON_${marketplace}_API_ENABLED=true. ` +
          `See docs/AMAZON.md.`,
      );
    }
    this.marketplace = marketplace;
  }

  async searchProducts(_query: ProductSearchQuery): Promise<ProductSearchResult> {
    throw new NotImplementedYetError("searchProducts", this.marketplace);
  }

  async getProduct(_asin: string): Promise<NormalizedProduct | null> {
    throw new NotImplementedYetError("getProduct", this.marketplace);
  }

  async getProducts(_asins: string[]): Promise<NormalizedProduct[]> {
    throw new NotImplementedYetError("getProducts", this.marketplace);
  }

  async getOffers(_asins: string[]): Promise<Record<string, NormalizedOffer | null>> {
    throw new NotImplementedYetError("getOffers", this.marketplace);
  }
}

class NotImplementedYetError extends Error {
  constructor(method: string, marketplace: MarketplaceCode) {
    super(
      `AmazonProvider(${marketplace}).${method} is not implemented. The live Creators API ` +
        "integration requires confirmed access and official docs before implementation — see docs/AMAZON.md.",
    );
    this.name = "NotImplementedYetError";
    logger.error("provider.not_implemented", { marketplace, method });
  }
}
