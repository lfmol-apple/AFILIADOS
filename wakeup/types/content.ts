export type GeneratableContentType =
  | "PRODUCT"
  | "BEST_OF"
  | "COMPARISON"
  | "CATEGORY"
  | "DEAL_SUMMARY";

/**
 * Raw, directly-observed data — from the marketplace or the product
 * catalog. A future LLM provider may state these as facts.
 */
export interface VerifiedProductFacts {
  title: string;
  brand?: string;
  categoryName?: string;
  description?: string;
  specifications?: Record<string, string | number | boolean>;
  rating?: number;
  reviewCount?: number;
  currency: string;
}

/**
 * Numbers PreçoCaindo itself derived (price stats, the Score). A future LLM
 * provider may state these as facts too, but must attribute the Score to
 * PreçoCaindo's own methodology, never to Amazon (project brief section 60).
 */
export interface VerifiedPriceCalculations {
  currentPrice: number;
  discountPercentage?: number;
  lowestPrice?: number;
  highestPrice?: number;
  avg30d?: number;
  coverageDays: number;
  opportunityScore?: number;
  opportunityLabel?: string;
}

/**
 * Instructions about *how* to write, never a source of facts. A generator
 * must not treat anything in here as something to state as true about the
 * product — it's tone/structure guidance only.
 */
export interface EditorialGuidance {
  tone: string;
  requiredSections: string[];
  disclosures: string[];
}

/**
 * The only payload a ContentProvider may read from. Splitting FACTS /
 * CALCULATIONS / EDITORIAL makes the no-hallucination rule mechanically
 * checkable: a real LLM provider's system prompt can say "state only
 * `facts` and `calculations` as true; `editorial` is style guidance" and a
 * reviewer can verify a claim against a specific field instead of trusting
 * prose (project brief Part H). MockContentProvider is the reference
 * implementation of this discipline — see lib/content/mock-content-provider.ts.
 */
export interface VerifiedFacts {
  facts: VerifiedProductFacts;
  calculations: VerifiedPriceCalculations;
  editorial: EditorialGuidance;
}

export interface ContentGenerationRequest {
  contentType: GeneratableContentType;
  promptVersion: string;
  slug: string;
  facts: VerifiedFacts | Record<string, unknown>;
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
