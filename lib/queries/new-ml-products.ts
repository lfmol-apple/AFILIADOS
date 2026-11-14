import { prisma } from "@/lib/db";

export interface NewMlProductRow {
  merchantListingId: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
}

/**
 * The ~91 real-world products confirmed live (2026-11-14) to exist in the
 * pre-2026-09-24 ML backlog under no listing that's ever been linked or
 * matched — distinct from the queries/amazon-match-queue.ts queue's own
 * sibling-dedup, this is specifically for the owner's own Linkbuilder
 * flow: one representative MerchantListing per canonicalProductId (the
 * oldest by id, for a stable pick across calls), with its real
 * productUrl to open on Mercado Livre and generate the link from.
 */
export async function loadNewMlProducts(): Promise<NewMlProductRow[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      merchantListingId: string;
      title: string | null;
      imageUrl: string | null;
      productUrl: string;
    }>
  >`
    WITH ranked AS (
      SELECT ml.id AS "merchantListingId",
        ml."productUrl",
        coalesce(cp.title, latest_signal.raw->>'productName') AS title,
        coalesce(cp."imageUrl", latest_signal.raw->>'imageUrl') AS "imageUrl",
        row_number() OVER (
          PARTITION BY ml."canonicalProductId"
          ORDER BY ml.id ASC
        ) AS rn
      FROM "MerchantListing" ml
      JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code = 'MERCADO_LIVRE'
      LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
      LEFT JOIN LATERAL (
        SELECT s.raw FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id
        ORDER BY s."observedAt" DESC
        LIMIT 1
      ) latest_signal ON true
      LEFT JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id
      WHERE ml.active = true
        AND alr.id IS NULL
        AND ml."canonicalProductId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "MerchantListing" sibling
          LEFT JOIN "AffiliateLinkRegistry" salr ON salr."merchantListingId" = sibling.id
          WHERE sibling."canonicalProductId" = ml."canonicalProductId"
            AND sibling.id <> ml.id
            AND salr.status = 'ACTIVE'
        )
    )
    SELECT "merchantListingId", "productUrl", title, "imageUrl"
    FROM ranked
    WHERE rn = 1
    ORDER BY "merchantListingId" ASC
  `;

  return rows
    .filter((r): r is typeof r & { title: string } => Boolean(r.title))
    .map((r) => ({
      merchantListingId: r.merchantListingId,
      title: r.title,
      imageUrl: r.imageUrl,
      productUrl: r.productUrl,
    }));
}
