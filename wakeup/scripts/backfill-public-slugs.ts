/**
 * Manual, human-run utility that "warms" the Acquisition Engine's public
 * slugs (prisma/schema.prisma's MerchantListing.slug / CanonicalProduct.
 * publicSlug — see lib/queries/public-product.ts) for every currently
 * eligible Mercado Livre/Shopee listing, so app/sitemap.ts doesn't have to
 * wait for a first organic visit to a URL that doesn't exist yet.
 *
 * Read+write, but simple and idempotent (never regenerates an existing
 * slug) — never touches the scanner/cron jobs (jobs/ml-enrichment.ts,
 * jobs/shopee-refresh.ts) and is safe to re-run anytime.
 *
 * Usage: npx tsx scripts/backfill-public-slugs.ts
 */
import { ensurePublicSlugsForAllEligibleListings } from "@/lib/queries/public-product";

async function main() {
  const summary = await ensurePublicSlugsForAllEligibleListings();
  console.log("Backfill de slugs públicos — Acquisition Engine");
  console.log(`  CanonicalProduct (Mercado Livre) processados: ${summary.canonicalProductsProcessed}`);
  console.log(`  publicSlug gerado/confirmado: ${summary.canonicalProductsSlugGenerated}`);
  console.log(`  MerchantListing (Shopee) processados: ${summary.shopeeListingsProcessed}`);
  console.log(`  slug gerado/confirmado: ${summary.shopeeListingsSlugGenerated}`);
}

main()
  .catch((error) => {
    console.error("Falha no backfill de slugs públicos:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$disconnect();
  });
