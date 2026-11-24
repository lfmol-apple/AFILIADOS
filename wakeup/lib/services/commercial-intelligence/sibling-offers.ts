import { prisma } from "@/lib/db";

/**
 * Real seller-offer siblings of a catalog product — one MerchantListing
 * row per real offer, created by jobs/ml-enrichment.ts's
 * enrichCatalogListing, each carrying its own real price/condition/
 * seller reputation in its "mercado_livre_catalog_items" signal. Shared
 * by price-competitiveness.ts and the eligibility gate in
 * vitrine-selection.ts so both read the same real data once, instead of
 * two separate queries drifting apart.
 */
export interface SiblingOffer {
  price: number;
  condition: string | null;
  sellerReputationLevel: string | null;
  mlCategoryId: string | null;
}

export async function fetchSiblingOffers(canonicalProductId: string, excludeListingId?: string): Promise<SiblingOffer[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      canonicalProductId,
      ...(excludeListingId ? { id: { not: excludeListingId } } : {}),
      signals: { some: { source: "mercado_livre_catalog_items" } },
    },
    select: {
      signals: {
        where: { source: "mercado_livre_catalog_items" },
        orderBy: { observedAt: "desc" },
        take: 1,
        select: { raw: true },
      },
    },
  });

  return listings
    .map((l) => {
      const raw = l.signals[0]?.raw as
        | { price?: number; condition?: string; category_id?: string; seller?: { levelId?: string | null } }
        | null;
      if (!raw || typeof raw.price !== "number" || raw.price <= 0) return null;
      return {
        price: raw.price,
        condition: raw.condition ?? null,
        sellerReputationLevel: raw.seller?.levelId ?? null,
        mlCategoryId: raw.category_id ?? null,
      };
    })
    .filter((o): o is SiblingOffer => o !== null);
}

/** The cheapest real offer — used as "representative" for condition/
 * reputation/category when evaluating the listing as a whole (the offer
 * most likely to actually be the one linked/sent to the consumer). */
export function cheapestOffer(offers: readonly SiblingOffer[]): SiblingOffer | null {
  if (offers.length === 0) return null;
  return [...offers].sort((a, b) => a.price - b.price)[0]!;
}
