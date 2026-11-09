import { prisma } from "@/lib/db";

export interface AmazonMatchQueueRow {
  merchantListingId: string;
  merchant: "MERCADO_LIVRE" | "SHOPEE";
  title: string;
  imageUrl: string | null;
  searchUrl: string;
}

/**
 * Every active, purchasable ML/Shopee listing not yet reviewed for an
 * Amazon match — never filtered by click count (owner, 2026-11-09: "se
 * temos um ML no ar que ainda não foi clicado... tem que ter um botão").
 * A row disappears from this queue the moment any decision (MATCHED or
 * NO_MATCH) is recorded, via the `amazonMatch: null` filter — so the same
 * listing is never asked about twice.
 */
export async function getNextAmazonMatchBatch(
  limit: number,
): Promise<AmazonMatchQueueRow[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
      affiliateLink: { status: "ACTIVE" },
      amazonMatch: null,
    },
    include: {
      merchant: { select: { code: true } },
      canonicalProduct: { select: { title: true, imageUrl: true } },
      signals: { orderBy: { observedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return listings
    .map((listing) => {
      const raw = listing.signals[0]?.raw as
        | { productName?: string; imageUrl?: string }
        | null;
      const title = listing.canonicalProduct?.title ?? raw?.productName ?? null;
      if (!title) return null;
      const imageUrl = listing.canonicalProduct?.imageUrl ?? raw?.imageUrl ?? null;
      return {
        merchantListingId: listing.id,
        merchant: listing.merchant.code as "MERCADO_LIVRE" | "SHOPEE",
        title,
        imageUrl,
        searchUrl: `https://www.amazon.com.br/s?k=${encodeURIComponent(title)}`,
      };
    })
    .filter((row): row is AmazonMatchQueueRow => row !== null);
}

export async function countPendingAmazonMatches(): Promise<number> {
  return prisma.merchantListing.count({
    where: {
      active: true,
      affiliateLink: { status: "ACTIVE" },
      amazonMatch: null,
    },
  });
}
