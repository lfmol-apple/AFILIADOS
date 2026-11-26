/**
 * Owner's directive, 2026-11-26 ("Implemente um procedimento seguro de
 * exportação e importação dos registros exclusivos da Black Friday",
 * extended the same day for the second campaign, "independência das
 * campanhas"): dumps ONE campaign's BlackFridayProduct/
 * BlackFridayCreative rows to a portable JSON file, keyed by sha256
 * (creatives) and slotNumber (products, unique only WITHIN a campaign
 * now — see prisma/schema.prisma's own doc comment) — never by cuid,
 * which isn't stable across environments. Pairs with
 * scripts/import-black-friday-2026.ts.
 *
 * Usage: tsx scripts/export-black-friday-2026.ts <campaign-slug>
 * (defaults to "black-friday-2026" when omitted, for the original
 * campaign's own convenience).
 *
 * Deliberately does NOT reference any .{campaign}-staging directory
 * (gitignored, local-only) — every creative here is identified only by
 * its sha256 and the path it's already committed at under public/, so
 * the exported file is safe to run against any environment that has
 * this branch's committed files (production included), never requiring
 * the original raw import sources to be present.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";

async function main() {
  const campaign = process.argv[2] ?? "black-friday-2026";
  const creatives = await prisma.blackFridayCreative.findMany({ where: { campaign } });
  const products = await prisma.blackFridayProduct.findMany({
    where: { campaign },
    orderBy: { slotNumber: "asc" },
  });

  const creativeIdToSha = new Map(creatives.map((c) => [c.id, c.sha256]));

  const exportData = {
    campaign,
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
  const outPath = join(outDir, `${campaign}-export.json`);
  writeFileSync(outPath, JSON.stringify(exportData, null, 2));
  console.log(`Exportado (${campaign}): ${products.length} produtos, ${creatives.length} criativos -> ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
