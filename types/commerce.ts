// Provider-agnostic shapes. UI and domain services depend only on these,
// never on a specific marketplace's response format.

export type Availability = "IN_STOCK" | "OUT_OF_STOCK" | "UNKNOWN";

export interface NormalizedOffer {
  price: number;
  currency: string;
  originalPrice?: number;
  discountPercentage?: number;
  affiliateUrl: string;
  availability: Availability;
  observedAt: Date;
}

export interface NormalizedProduct {
  asin: string;
  provider: "AMAZON";
  title: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  categoryName?: string;
  specifications?: Record<string, string | number | boolean>;
  rating?: number;
  reviewCount?: number;
  offer: NormalizedOffer;
}

export interface ProductSearchQuery {
  keywords: string;
  categoryName?: string;
  page?: number;
}

export interface ProductSearchResult {
  products: NormalizedProduct[];
  totalResults: number;
  page: number;
}

/**
 * Marketplace-agnostic contract. Implementations must not scrape and must
 * only use officially sanctioned APIs. See lib/providers and docs/AMAZON.md.
 */
export interface CommerceProvider {
  readonly name: "AMAZON";

  searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult>;
  getProduct(asin: string): Promise<NormalizedProduct | null>;
  getProducts(asins: string[]): Promise<NormalizedProduct[]>;
  getOffers(asins: string[]): Promise<Record<string, NormalizedOffer | null>>;
}
