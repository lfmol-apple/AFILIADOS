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
 * whether the ML/Shopee side ever gets its own link, so "Ver no Mercado
 * Livre" can appear later, on its own, once that listing's real link is
 * read-and-pasted — no code change needed when that happens.
 *
 * Investigated live, 2026-11-14: of the ~52k unlinked ML MerchantListing
 * rows, 96% are just competing sellers' offers of a product already
 * linked under a different listing (same canonicalProductId as an
 * ACTIVE one) — zero new value. Only ~91 distinct products (≈2.3k
 * listing rows, already carrying real title/image) are genuinely never
 * linked under any listing. This filter surfaces exactly those, without
 * re-asking about a product already decided via its linked sibling.
 */
interface CandidateRow {
  id: string;
  merchantCode: "MERCADO_LIVRE" | "SHOPEE";
  title: string | null;
  imageUrl: string | null;
}

export async function getNextAmazonMatchBatch(
  limit: number,
): Promise<AmazonMatchQueueRow[]> {
  const rows = await prisma.$queryRaw<CandidateRow[]>`
    SELECT ml.id, m.code AS "merchantCode",
      coalesce(cp.title, latest_signal.raw->>'productName') AS title,
      coalesce(cp."imageUrl", latest_signal.raw->>'imageUrl') AS "imageUrl"
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
    LEFT JOIN LATERAL (
      SELECT s.raw FROM "MerchantListingSignal" s
      WHERE s."merchantListingId" = ml.id
      ORDER BY s."observedAt" DESC
      LIMIT 1
    ) latest_signal ON true
    WHERE ml.active = true
      AND NOT EXISTS (SELECT 1 FROM "AmazonMatch" am WHERE am."merchantListingId" = ml.id)
      -- Skip a listing whose real-world product a sibling (same
      -- canonicalProductId) already resolved: either already ACTIVE-linked
      -- under a different listing, or already reviewed (MATCHED/NO_MATCH).
      -- Prevents asking the same real product's match decision once per
      -- competing seller — confirmed live, 2026-11-14: 96% of unlinked ML
      -- listings are exactly this kind of duplicate.
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListing" sibling
        LEFT JOIN "AffiliateLinkRegistry" salr ON salr."merchantListingId" = sibling.id
        LEFT JOIN "AmazonMatch" sam ON sam."merchantListingId" = sibling.id
        WHERE sibling."canonicalProductId" = ml."canonicalProductId"
          AND ml."canonicalProductId" IS NOT NULL
          AND sibling.id <> ml.id
          AND (salr.status = 'ACTIVE' OR sam.id IS NOT NULL)
      )
    ORDER BY ml."createdAt" ASC
    LIMIT ${limit}
  `;

  return rows
    .filter((row): row is CandidateRow & { title: string } => Boolean(row.title))
    .map((row) => ({
      merchantListingId: row.id,
      merchant: row.merchantCode,
      title: row.title,
      imageUrl: row.imageUrl,
      searchUrl: `https://www.amazon.com.br/s?k=${encodeURIComponent(row.title)}`,
    }));
}

/** Mirrors getNextAmazonMatchBatch's own filters exactly (title present,
 * no sibling already resolved) so the admin dashboard's number always
 * matches what the queue will actually hand out — never the inflated
 * total of every unlinked listing row. */
export async function countPendingAmazonMatches(): Promise<number> {
  const rows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT count(*)::bigint AS count
    FROM "MerchantListing" ml
    LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
    WHERE ml.active = true
      AND NOT EXISTS (SELECT 1 FROM "AmazonMatch" am WHERE am."merchantListingId" = ml.id)
      AND (
        cp.title IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM "MerchantListingSignal" s
          WHERE s."merchantListingId" = ml.id AND s.raw->>'productName' IS NOT NULL
        )
      )
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListing" sibling
        LEFT JOIN "AffiliateLinkRegistry" salr ON salr."merchantListingId" = sibling.id
        LEFT JOIN "AmazonMatch" sam ON sam."merchantListingId" = sibling.id
        WHERE sibling."canonicalProductId" = ml."canonicalProductId"
          AND ml."canonicalProductId" IS NOT NULL
          AND sibling.id <> ml.id
          AND (salr.status = 'ACTIVE' OR sam.id IS NOT NULL)
      )
  `;
  return Number(rows[0]?.count ?? 0);
}
