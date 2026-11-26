/**
 * Owner's directive, 2026-11-26 ("Implemente um procedimento seguro de
 * exportação e importação dos registros exclusivos da Black Friday"):
 * dumps the current BlackFridayProduct/BlackFridayCreative tables to a
 * portable JSON file, keyed by sha256 (creatives) and slotNumber
 * (products) — never by cuid, which isn't stable across environments.
 * Pairs with scripts/import-black-friday-2026.ts.
 *
 * Deliberately does NOT reference .black-friday-2026-staging (gitignored,
 * local-only) — every creative here is identified only by its sha256 and
 * the path it's already committed at under public/black-friday-2026/, so
 * the exported file is safe to run against any environment that has this
 * branch's committed files (production included), never requiring the
 * original raw import sources to be present.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";

async function main() {
  const creatives = await prisma.blackFridayCreative.findMany();
  const products = await prisma.blackFridayProduct.findMany({ orderBy: { slotNumber: "asc" } });

  const creativeIdToSha = new Map(creatives.map((c) => [c.id, c.sha256]));

  const exportData = {
    exportedAt: new Date().toISOString(),
    creatives: creatives.map((c) => ({
      sha256: c.sha256,
      groupKey: c.groupKey,
      originalFilename: c.originalFilename,
      storedPath: c.storedPath,
    })),
    products: products.map((p) => ({
      slotNumber: p.slotNumber,
      creativeGroupKey: p.creativeGroupKey,
      name: p.name,
      brand: p.brand,
      advertisedPrice: p.advertisedPrice !== null ? Number(p.advertisedPrice) : null,
      currentPrice: p.currentPrice !== null ? Number(p.currentPrice) : null,
      mlUrlOriginal: p.mlUrlOriginal,
      resolvedProductUrl: p.resolvedProductUrl,
      resolvedExternalId: p.resolvedExternalId,
      resolvedTitle: p.resolvedTitle,
      enabled: p.enabled,
      affiliateUrl: p.affiliateUrl,
      attributionTag: p.attributionTag,
      status: p.status,
      reviewNote: p.reviewNote,
      selectedCreativeSha256: p.selectedCreativeId ? (creativeIdToSha.get(p.selectedCreativeId) ?? null) : null,
    })),
  };

  const outDir = join(process.cwd(), "data");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "black-friday-2026-export.json");
  writeFileSync(outPath, JSON.stringify(exportData, null, 2));
  console.log(`Exportado: ${products.length} produtos, ${creatives.length} criativos -> ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
