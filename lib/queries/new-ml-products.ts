import { prisma } from "@/lib/db";

export interface NewMlProductRow {
  merchantListingId: string;
  title: string;
  imageUrl: string | null;
  productUrl: string;
}

/**
 * The never-linked backlog products (lib/queries/amazon-match-queue.ts's
 * own sibling-dedup covers the "which real products are these" half of
 * this; this file is the owner's own Linkbuilder flow).
 *
 * Owner's feedback, 2026-11-14: pasting these into Linkbuilder, most came
 * back "produto pausado" or "não cumpre com os requisitos do Programa" —
 * the stored data was months old, and the row picked (oldest by id) was
 * often the original catalog-product discovery row, never a real,
 * individually-sellable item. scripts/live-verify-new-ml-products.ts now
 * re-runs the real enrichCatalogListing() API call for each of these
 * catalog products right now, which refreshes a real `mercado_livre_
 * catalog_items` signal (with today's observedAt) for every item still
 * genuinely selling. This picks, per canonicalProductId, the ITEM sibling
 * (never the catalog-id row itself — that's a buy-box page, not a single
 * seller's offer) with the single freshest such signal, and only when
 * that signal is from the last 24h — i.e. confirmed alive moments ago,
 * never a stale guess. A canonical product whose live re-check found
 * nothing fresh (fully discontinued) simply drops out.
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
        latest_signal."observedAt" AS freshest_observed_at,
        row_number() OVER (
          PARTITION BY ml."canonicalProductId"
          ORDER BY latest_signal."observedAt" DESC
        ) AS rn
      FROM "MerchantListing" ml
      JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code = 'MERCADO_LIVRE'
      LEFT JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
      JOIN LATERAL (
        SELECT s.raw, s."observedAt" FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
        ORDER BY s."observedAt" DESC
        LIMIT 1
      ) latest_signal ON true
      LEFT JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id
      WHERE ml.active = true
        AND alr.id IS NULL
        AND ml."canonicalProductId" IS NOT NULL
        -- Never the catalog-product-id row itself: that's a buy-box page,
        -- not one seller's sellable item (the thing Linkbuilder needs).
        AND ml."externalId" != coalesce(cp.specifications->>'catalogProductId', '')
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
    WHERE rn = 1 AND freshest_observed_at >= now() - interval '24 hours'
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
