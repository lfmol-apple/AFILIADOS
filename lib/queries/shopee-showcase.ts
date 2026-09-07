import { prisma } from "@/lib/db";

export interface ShopeeShowcaseItem {
  merchantListingId: string;
  externalId: string;
  title: string;
  affiliateUrl: string;
  monetizationScore: number | null;
}

/**
 * Real Shopee opportunities safe to show publicly: MonetizationScore
 * exists AND the listing has an ACTIVE affiliate link (project brief
 * rule: "só mostrar CTA comercial se houver affiliate link ACTIVE").
 * `title` is read from the latest MerchantListingSignal.raw snapshot —
 * MerchantListing itself has no title column (by design, see
 * CanonicalProduct for the real cross-merchant identity); reusing the raw
 * signal here avoids a schema change for what is, today, a minimal first
 * public surface. A future revision should link these to a proper
 * CanonicalProduct via ProductMatcher instead.
 */
export async function getShopeeShowcase(
  limit: number = 8,
): Promise<ShopeeShowcaseItem[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: "SHOPEE" },
      affiliateLink: { is: { status: "ACTIVE" } },
      monetizationScore: { isNot: null },
    },
    include: {
      affiliateLink: true,
      monetizationScore: true,
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
    },
    orderBy: { monetizationScore: { score: "desc" } },
    take: limit,
  });

  return listings
    .map((listing): ShopeeShowcaseItem | null => {
      if (!listing.affiliateLink?.affiliateUrl) return null;
      const raw = listing.signals[0]?.raw as { productName?: string } | null;
      const title = raw?.productName ?? listing.externalId;
      return {
        merchantListingId: listing.id,
        externalId: listing.externalId,
        title,
        affiliateUrl: listing.affiliateLink.affiliateUrl,
        monetizationScore: listing.monetizationScore?.score ?? null,
      };
    })
    .filter((item): item is ShopeeShowcaseItem => item !== null);
}
