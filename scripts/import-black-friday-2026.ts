/**
 * Owner's directive, 2026-11-26 ("Garanta que os 30 produtos e
 * respectivos criativos sejam cadastrados corretamente no banco de
 * produção, sem afetar os dados existentes" + "procedimento seguro de
 * exportação e importação"): the production-safe counterpart to
 * scripts/export-black-friday-2026.ts. Reads
 * data/black-friday-2026-export.json (committed to the repo — see that
 * file) and upserts BlackFridayCreative/BlackFridayProduct rows from it.
 *
 * Never touches any other table — only BlackFridayCreative/
 * BlackFridayProduct, by slotNumber/sha256, the same additive-only
 * tables the migrations already created. Verifies every creative's file
 * is ALREADY on disk (it's committed to git, so it's part of the Docker
 * image after deploy) and re-hashes it before trusting the export —
 * never assumes the export file wasn't tampered with or desynced from
 * the real files.
 *
 * Idempotent: an UPDATE never overwrites affiliateUrl/status/
 * currentPrice/selectedCreativeId if the target row already has a
 * non-null value there — running this again after the owner has
 * started pasting links in production is safe and never clobbers their
 * work (same rule as scripts/reconcile-black-friday-2026-official-list.ts's
 * own doc comment, this time enforced for real since production rows
 * will actually be edited after this import).
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { prisma } from "@/lib/db";

interface ExportedCreative {
  sha256: string;
  groupKey: string;
  originalFilename: string;
  storedPath: string;
}

interface ExportedProduct {
  slotNumber: number;
  creativeGroupKey: string;
  name: string;
  brand: string | null;
  advertisedPrice: number | null;
  currentPrice: number | null;
  mlUrlOriginal: string | null;
  resolvedProductUrl: string | null;
  resolvedExternalId: string | null;
  resolvedTitle: string | null;
  enabled: boolean;
  affiliateUrl: string | null;
  attributionTag: string;
  status: "PENDING_LINK" | "LINK_PASTED" | "VALIDATED" | "DIVERGENT" | "REJECTED";
  reviewNote: string | null;
  selectedCreativeSha256: string | null;
}

async function main() {
  const exportPath = join(process.cwd(), "data", "black-friday-2026-export.json");
  const raw = JSON.parse(readFileSync(exportPath, "utf-8")) as {
    creatives: ExportedCreative[];
    products: ExportedProduct[];
  };

  let creativesImported = 0;
  const shaToId = new Map<string, string>();

  for (const c of raw.creatives) {
    const absolutePath = join(process.cwd(), "public", c.storedPath.replace(/^\//, ""));
    if (!existsSync(absolutePath)) {
      throw new Error(
        `Arquivo ausente no disco: ${c.storedPath} (criativo ${c.originalFilename}, grupo ${c.groupKey}). ` +
          `Confirme que o deploy já trouxe os arquivos commitados antes de rodar esta importação.`,
      );
    }
    const actualSha256 = createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
    if (actualSha256 !== c.sha256) {
      throw new Error(
        `Hash divergente para ${c.storedPath}: esperado ${c.sha256}, encontrado ${actualSha256}. ` +
          `O arquivo pode ter sido alterado — importação abortada para este item.`,
      );
    }
    const row = await prisma.blackFridayCreative.upsert({
      where: { sha256: c.sha256 },
      update: { groupKey: c.groupKey, originalFilename: c.originalFilename, storedPath: c.storedPath },
      create: c,
    });
    shaToId.set(c.sha256, row.id);
    creativesImported += 1;
  }

  let productsImported = 0;
  for (const p of raw.products) {
    const selectedCreativeId = p.selectedCreativeSha256 ? (shaToId.get(p.selectedCreativeSha256) ?? null) : null;
    const existing = await prisma.blackFridayProduct.findUnique({
      where: { campaign_slotNumber: { campaign: "black-friday-2026", slotNumber: p.slotNumber } },
    });

    const facts = {
      creativeGroupKey: p.creativeGroupKey,
      name: p.name,
      brand: p.brand,
      advertisedPrice: p.advertisedPrice,
      mlUrlOriginal: p.mlUrlOriginal,
      resolvedProductUrl: p.resolvedProductUrl,
      resolvedExternalId: p.resolvedExternalId,
      resolvedTitle: p.resolvedTitle,
      attributionTag: p.attributionTag,
      reviewNote: p.reviewNote,
    };

    await prisma.blackFridayProduct.upsert({
      where: { campaign_slotNumber: { campaign: "black-friday-2026", slotNumber: p.slotNumber } },
      update: {
        ...facts,
        // Never clobber real owner progress already in this environment.
        ...(existing?.currentPrice == null ? { currentPrice: p.currentPrice } : {}),
        ...(existing?.affiliateUrl == null ? { affiliateUrl: p.affiliateUrl } : {}),
        ...(existing?.selectedCreativeId == null && selectedCreativeId ? { selectedCreativeId } : {}),
        ...(existing && existing.status === "PENDING_LINK" ? { status: p.status } : {}),
        ...(existing ? {} : { enabled: p.enabled }),
      },
      create: {
        campaign: "black-friday-2026",
        slotNumber: p.slotNumber,
        ...facts,
        currentPrice: p.currentPrice,
        affiliateUrl: p.affiliateUrl,
        selectedCreativeId,
        status: p.status,
        enabled: p.enabled,
      },
    });
    productsImported += 1;
  }

  console.log(`Importado: ${creativesImported} criativos, ${productsImported} produtos.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
