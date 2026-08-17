export type GeneratableContentType =
  "PRODUCT" | "BEST_OF" | "COMPARISON" | "CATEGORY" | "DEAL_SUMMARY";

/**
 * Only facts explicitly passed here may appear in generated content.
 * ContentProvider implementations must never invent a field that isn't
 * present — see project brief section 15 (absolute rule against
 * hallucination) and docs/CONTENT_ENGINE.md.
 */
export interface ProductFacts {
  title: string;
  brand?: string;
  categoryName?: string;
  description?: string;
  specifications?: Record<string, string | number | boolean>;
  rating?: number;
  reviewCount?: number;
  currentPrice: number;
  currency: string;
  discountPercentage?: number;
  lowestPrice?: number;
  highestPrice?: number;
  avg30d?: number;
  coverageDays: number;
  opportunityScore?: number;
  opportunityLabel?: string;
}

export interface ContentGenerationRequest {
  contentType: GeneratableContentType;
  promptVersion: string;
  slug: string;
  facts: ProductFacts | Record<string, unknown>;
}

export interface ContentGenerationResult {
  title: string;
  metaTitle: string;
  metaDescription: string;
  body: string;
  model: string;
  promptVersion: string;
}

export interface ContentProvider {
  readonly name: string;
  generate(request: ContentGenerationRequest): Promise<ContentGenerationResult>;
}
