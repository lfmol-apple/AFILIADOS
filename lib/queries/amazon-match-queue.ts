import { prisma } from "@/lib/db";

export interface AmazonMatchQueueRow {
  merchantListingId: string;
  merchant: "MERCADO_LIVRE" | "SHOPEE";
  title: string;
  imageUrl: string | null;
  searchUrl: string;
}

/**
 * Every active, identified ML/Shopee listing not yet reviewed for an
 * Amazon match — never filtered by click count (owner, 2026-11-09: "se
 * temos um ML no ar que ainda não foi clicado... tem que ter um botão").
 * A row disappears from this queue the moment any decision (MATCHED or
 * NO_MATCH) is recorded, via the `amazonMatch: null` filter — so the same
 * listing is never asked about twice.
 *
 * No longer requires an ACTIVE AffiliateLinkRegistry row (owner's
 * decision, 2026-11-14): MATCHED already creates its own, independent
 * Amazon Product page (lib/services/amazon-match.ts) regardless of
 * whether the ML/Shopee side ever gets its own link — so the pre-2026-09-24
 * backlog (title/image filled in by jobs/ml-enrich-backlog.ts) can be
 * matched and monetized via Amazon/Shopee today, with "Ver no Mercado
 * Livre" appearing later, on its own, once that listing's real link is
 * read-and-pasted. The `title` check below still naturally excludes any
 * backlog listing ML_ENRICH_BACKLOG hasn't reached yet.
 */
export async function getNextAmazonMatchBatch(
  limit: number,
): Promise<AmazonMatchQueueRow[]> {
  const listings = await prisma.merchantListing.findMany({
    where: {
      active: true,
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

/** Mirrors getNextAmazonMatchBatch's own title requirement (a raw EXISTS
 * check, since Prisma's count() can't apply the post-fetch `if (!title)`
 * filter above) — otherwise this would count tens of thousands of
 * not-yet-enriched backlog listings that can't actually appear in the
 * queue yet, making the admin dashboard's number meaningless. */
export async function countPendingAmazonMatches(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM "MerchantListing" ml
    LEFT JOIN "AmazonMatch" am ON am."merchantListingId" = ml.id
    LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
    WHERE ml.active = true
      AND am.id IS NULL
      AND (
        cp.title IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM "MerchantListingSignal" s
          WHERE s."merchantListingId" = ml.id
            AND s.raw->>'productName' IS NOT NULL
        )
      )
  `;
  return Number(rows[0]?.count ?? 0);
}
