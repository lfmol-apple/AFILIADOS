import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import { MOCK_CATALOG } from "./mock-catalog";

/**
 * Deterministic, in-memory stand-in for the real Amazon integration. Lets the
 * whole app (UI, jobs, tests) be developed and demoed before Creators API
 * access is available. Never used when AMAZON_PROVIDER=live.
 */
export class MockAmazonProvider implements CommerceProvider {
  readonly name = "AMAZON" as const;

  async searchProducts(
    query: ProductSearchQuery,
  ): Promise<ProductSearchResult> {
    const keywords = query.keywords.toLowerCase();
    const matches = MOCK_CATALOG.filter(
      (p) =>
        p.title.toLowerCase().includes(keywords) ||
        p.categoryName?.toLowerCase().includes(keywords),
    );
    return {
      products: matches,
      totalResults: matches.length,
      page: query.page ?? 1,
    };
  }

  async getProduct(asin: string): Promise<NormalizedProduct | null> {
    return MOCK_CATALOG.find((p) => p.asin === asin) ?? null;
  }

  async getProducts(asins: string[]): Promise<NormalizedProduct[]> {
    const set = new Set(asins);
    return MOCK_CATALOG.filter((p) => set.has(p.asin));
  }

  async getOffers(
    asins: string[],
  ): Promise<Record<string, NormalizedOffer | null>> {
    const result: Record<string, NormalizedOffer | null> = {};
    for (const asin of asins) {
      const product = MOCK_CATALOG.find((p) => p.asin === asin);
      result[asin] = product?.offer ?? null;
    }
    return result;
  }
}
