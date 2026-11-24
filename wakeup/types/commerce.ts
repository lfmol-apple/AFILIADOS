// Provider-agnostic shapes. UI and domain services depend only on these,
// never on a specific marketplace's response format. A provider instance is
// always scoped to one marketplace (see lib/providers) — these payload
// types don't carry a marketplace field themselves because "which
// marketplace" is a property of *which provider you asked*, not of the data
// (the caller already knows, and Product itself is marketplace-scoped).

import type { MarketplaceCode } from "./marketplace";

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
  provider:
    "AMAZON" | "MERCADO_LIVRE" | "SHOPEE" | "AWIN" | "GENERIC_AFFILIATE";
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
 * A single instance always talks to exactly one marketplace — never mix
 * results from two `CommerceProvider` instances into one `NormalizedOffer`.
 */
export interface CommerceProvider {
  readonly name:
    "AMAZON" | "MERCADO_LIVRE" | "SHOPEE" | "AWIN" | "GENERIC_AFFILIATE";
  readonly marketplace: MarketplaceCode;
  readonly capabilities?: {
    search?: boolean;
    productLookup?: boolean;
    offers?: boolean;
    affiliateUrl?: boolean;
  };

  searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult>;
  getProduct(asin: string): Promise<NormalizedProduct | null>;
  getProducts(asins: string[]): Promise<NormalizedProduct[]>;
  getOffers(asins: string[]): Promise<Record<string, NormalizedOffer | null>>;
}
