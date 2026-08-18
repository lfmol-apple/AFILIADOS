import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import type { MarketplaceCode } from "@/types/marketplace";
import { MOCK_CATALOG } from "./mock-catalog";

/**
 * Deterministic, in-memory stand-in for the real Amazon integration. Lets the
 * whole app (UI, jobs, tests) be developed and demoed before Creators API
 * access is available. Never used when AMAZON_PROVIDER=live.
 *
 * Scoped to one marketplace at construction. `MOCK_CATALOG` is BR-only (see
 * that file) — a US instance deliberately serves an empty catalog rather
 * than reusing BR data, since there is no real second-marketplace mock
 * catalog to be faithful to yet (project brief Sprint 4 section 11).
 */
export class MockAmazonProvider implements CommerceProvider {
  readonly name = "AMAZON" as const;
  readonly marketplace: MarketplaceCode;

  constructor(marketplace: MarketplaceCode) {
    this.marketplace = marketplace;
  }

  private get catalog(): NormalizedProduct[] {
    return this.marketplace === "BR" ? MOCK_CATALOG : [];
  }

  async searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const keywords = query.keywords.toLowerCase();
    const matches = this.catalog.filter(
      (p) =>
        p.title.toLowerCase().includes(keywords) ||
        p.categoryName?.toLowerCase().includes(keywords),
    );
    return { products: matches, totalResults: matches.length, page: query.page ?? 1 };
  }

  async getProduct(asin: string): Promise<NormalizedProduct | null> {
    return this.catalog.find((p) => p.asin === asin) ?? null;
  }

  async getProducts(asins: string[]): Promise<NormalizedProduct[]> {
    const set = new Set(asins);
    return this.catalog.filter((p) => set.has(p.asin));
  }

  async getOffers(asins: string[]): Promise<Record<string, NormalizedOffer | null>> {
    const result: Record<string, NormalizedOffer | null> = {};
    for (const asin of asins) {
      const product = this.catalog.find((p) => p.asin === asin);
      result[asin] = product?.offer ?? null;
    }
    return result;
  }
}
