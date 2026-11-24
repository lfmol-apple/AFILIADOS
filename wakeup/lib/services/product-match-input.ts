import type { MatchableListing } from "@/types/product-match";

/**
 * Real field-availability map for ProductMatcher's input (ProductMatcher
 * Shadow Mode, 2026-09-08). MerchantListing itself carries none of
 * title/brand/model/gtin as its own columns — they live in different
 * places per merchant, confirmed against real production data:
 *
 *  - Mercado Livre: EVERY real offer AND its catalog-level row already
 *    share one CanonicalProduct (lib/services/ml-enrichment-collector.ts
 *    sets `canonicalProductId` on both) — title/brand/model/gtin come
 *    from there. `manufacturerId` is NOT collected by any existing
 *    source today (a documented gap, not inferred here).
 *  - Shopee: `productOfferV2`'s real, already-persisted response
 *    (MerchantListingSignal.raw, source "shopee_product_offer_v2") has
 *    NO brand/model/gtin/category field at all — confirmed by inspecting
 *    every key ever seen across this project's real payloads. Only
 *    `productName` (title) is usable. This is a real API limitation, not
 *    a bug — see docs/PRODUCT_MATCHER.md.
 */
export interface ListingForMatching {
  id: string;
  canonicalProduct: {
    title: string;
    brand: string | null;
    model: string | null;
    gtin: string | null;
  } | null;
  /** Latest `shopee_product_offer_v2` signal's `productName`, when this
   * is a Shopee listing — null for everything else (or a Shopee listing
   * with no signal yet). */
  shopeeTitle: string | null;
}

/** Returns null when no identifiable title exists at all — such a
 * listing cannot participate in matching (every tier in
 * lib/services/product-matcher.ts needs at least a title for the
 * textual-candidate fallback). Never fabricates a title. */
export function buildMatchableListing(listing: ListingForMatching): MatchableListing | null {
  const title = listing.canonicalProduct?.title ?? listing.shopeeTitle ?? null;
  if (!title) return null;

  return {
    id: listing.id,
    title,
    brand: listing.canonicalProduct?.brand ?? null,
    model: listing.canonicalProduct?.model ?? null,
    gtin: listing.canonicalProduct?.gtin ?? null,
    // No source populates this today (see file-level doc comment) —
    // always null, never guessed from another field.
    manufacturerId: null,
  };
}
