import { prisma } from "@/lib/db";
import { createMercadoLivreProvider } from "@/lib/services/ml-token-store";
import { enrichCatalogListing } from "@/lib/services/ml-enrichment-collector";
import type { MercadoLivreSellerReputation } from "@/lib/providers/mercado-livre-provider";

/**
 * One-time live re-check (2026-11-14, owner's request: "essa lista não
 * pode falhar") for the ~91 never-linked backlog products
 * (lib/queries/new-ml-products.ts): a good share had gone stale enough
 * (months-old data) that Linkbuilder itself rejected them as paused or
 * program-ineligible when the owner actually tried. This re-runs the
 * exact same real, tested enrichCatalogListing() call against each
 * catalog product RIGHT NOW, which both confirms what's still really
 * selling and refreshes which sibling item is freshest — so
 * loadNewMlProducts() can start preferring the freshest sibling instead
 * of an arbitrary old one. Never touches AffiliateLinkRegistry.
 */
interface Target {
  canonicalProductId: string;
  id: string;
  externalId: string;
}

async function loadTargets(): Promise<Target[]> {
  return prisma.$queryRaw<Target[]>`
    WITH linked_canonicals AS (
      SELECT DISTINCT ml."canonicalProductId"
      FROM "MerchantListing" ml
      JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code = 'MERCADO_LIVRE'
      JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
      WHERE ml."canonicalProductId" IS NOT NULL
    ),
    targets AS (
      SELECT DISTINCT cp.id AS "canonicalProductId",
        cp.specifications->>'catalogProductId' AS catalog_product_id
      FROM "MerchantListing" ml
      JOIN "Merchant" m ON m.id = ml."merchantId" AND m.code = 'MERCADO_LIVRE'
      LEFT JOIN "AffiliateLinkRegistry" alr ON alr."merchantListingId" = ml.id
      JOIN "CanonicalProduct" cp ON cp.id = ml."canonicalProductId"
      WHERE ml.active = true AND alr.id IS NULL
        AND ml."canonicalProductId" NOT IN (SELECT "canonicalProductId" FROM linked_canonicals)
    )
    SELECT t."canonicalProductId", ml2.id AS "id", ml2."externalId"
    FROM targets t
    JOIN "MerchantListing" ml2
      ON ml2."externalId" = t.catalog_product_id
      AND ml2."canonicalProductId" = t."canonicalProductId"
  `;
}

async function main() {
  const provider = await createMercadoLivreProvider();
  const merchant = await prisma.merchant.upsert({
    where: { code: "MERCADO_LIVRE" },
    create: { code: "MERCADO_LIVRE", name: "Mercado Livre", active: true },
    update: {},
  });
  const targets = await loadTargets();
  console.log(`Re-checking ${targets.length} catalog products live...`);

  const sellerCache = new Map<number, MercadoLivreSellerReputation | null>();
  let ok = 0;
  let notFound = 0;
  let errors = 0;

  for (const target of targets) {
    try {
      const result = await enrichCatalogListing(
        provider,
        merchant.id,
        target,
        50,
        sellerCache,
      );
      if (!result) {
        notFound += 1;
        console.log(`404 (gone): ${target.externalId}`);
      } else {
        ok += 1;
        console.log(
          `OK: ${target.externalId} — ${result.offersProcessed} ofertas vivas agora`,
        );
      }
    } catch (err) {
      errors += 1;
      console.error(`ERRO: ${target.externalId} — ${String(err)}`);
    }
  }

  console.log(JSON.stringify({ total: targets.length, ok, notFound, errors }));
}

main()
  .catch((err) => {
    console.error("live-verify-new-ml-products failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
