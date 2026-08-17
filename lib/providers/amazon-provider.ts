import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import { env } from "@/lib/config/env";

/**
 * Real Amazon integration via the Creators API. NOT implemented yet: doing
 * so requires confirmed API access and the official request/auth spec (see
 * docs/AMAZON.md and section 54 of the project brief). This class exists so
 * the rest of the system can depend on `CommerceProvider` today and switch
 * to a live implementation later purely via AMAZON_PROVIDER=live, without
 * touching call sites.
 *
 * Intentionally has no scraping fallback (section 55): if the API call
 * cannot be made, every method fails loudly instead of guessing.
 */
export class AmazonProvider implements CommerceProvider {
  readonly name = "AMAZON" as const;

  constructor() {
    if (!env.AMAZON_CREATORS_API_KEY || !env.AMAZON_CREATORS_API_SECRET) {
      throw new Error(
        "AmazonProvider requires AMAZON_CREATORS_API_KEY/SECRET. Configure Creators API " +
          "credentials or set AMAZON_PROVIDER=mock. See docs/AMAZON.md.",
      );
    }
  }

  async searchProducts(
    _query: ProductSearchQuery,
  ): Promise<ProductSearchResult> {
    throw new NotImplementedYetError("searchProducts");
  }

  async getProduct(_asin: string): Promise<NormalizedProduct | null> {
    throw new NotImplementedYetError("getProduct");
  }

  async getProducts(_asins: string[]): Promise<NormalizedProduct[]> {
    throw new NotImplementedYetError("getProducts");
  }

  async getOffers(
    _asins: string[],
  ): Promise<Record<string, NormalizedOffer | null>> {
    throw new NotImplementedYetError("getOffers");
  }
}

class NotImplementedYetError extends Error {
  constructor(method: string) {
    super(
      `AmazonProvider.${method} is not implemented. The live Creators API integration ` +
        "requires confirmed access and official docs before implementation — see docs/AMAZON.md.",
    );
    this.name = "NotImplementedYetError";
  }
}
