/**
 * Owner's directive, 2026-11-26 ("O Henrique acaba de entregar os dois
 * criativos faltantes"): imports the 2 creatives that were missing for
 * slots 12 (Parafusadeira 21V 2 baterias 46 peças) and 14 (Purificador
 * Electrolux PE11B) — the only 2 products left without a matching
 * creative after the official-list reconciliation
 * (scripts/reconcile-black-friday-2026-official-list.ts). Identified
 * visually (brand/model/spec/price on the creative itself), never by
 * file order — the file WITHOUT "(1)" is the Electrolux purifier, the
 * file WITH "(1)" is The Black Tools drill/driver kit, confirmed by
 * reading both images this session.
 *
 * Touches ONLY BlackFridayProduct rows for slotNumber 12 and 14 — no
 * other product, by the owner's explicit instruction ("não altere os
 * demais produtos neste momento").
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";

const SOURCE_DIR = "/Users/leonardomol/Downloads/WhatsApp Unknown 2026-11-26 at 12.04.42";
const PUBLIC_DIR = join(process.cwd(), "public", "black-friday-2026");

interface NewCreative {
  slot: number;
  groupKey: string;
  file: string;
  advertisedPrice: number;
}

const ITEMS: NewCreative[] = [
  {
    // "Furadeira Parafusadeira de Impacto" — The Black Tools, 21V,
    // 2 baterias, 46 peças, maleta — exact match for slot 12's official
    // spec ("Parafusadeira de Impacto 21V 2 Baterias 46 Peças").
    slot: 12,
    groupKey: "parafusadeira-21v-46pc",
    file: "WhatsApp Image 2026-11-26 at 12.04.14 (1).jpeg",
    advertisedPrice: 199.90,
  },
  {
    // "Purificador de Água Eletrônico Compacto PE11B Bivolt" —
    // Electrolux — exact match for slot 14.
    slot: 14,
    groupKey: "electrolux-purificador-pe11b",
    file: "WhatsApp Image 2026-11-26 at 12.04.14.jpeg",
    advertisedPrice: 755.00,
  },
];

function importCreative(file: string, groupKey: string) {
  const srcPath = join(SOURCE_DIR, file);
  const bytes = readFileSync(srcPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storedName = `${sha256.slice(0, 16)}.jpeg`;
  const destPath = join(PUBLIC_DIR, storedName);
  if (!existsSync(destPath)) copyFileSync(srcPath, destPath);
  return { sha256, storedPath: `/black-friday-2026/${storedName}`, originalFilename: file, groupKey };
}

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const item of ITEMS) {
    const info = importCreative(item.file, item.groupKey);
    const creative = await prisma.blackFridayCreative.upsert({
      where: { sha256: info.sha256 },
      update: {},
      create: info,
    });

    const updated = await prisma.blackFridayProduct.update({
      where: { campaign_slotNumber: { campaign: "black-friday-2026", slotNumber: item.slot } },
      data: {
        creativeGroupKey: item.groupKey,
        advertisedPrice: item.advertisedPrice,
        selectedCreativeId: creative.id,
        reviewNote: null,
      },
    });
    console.log(`Slot ${item.slot}: ${updated.name} -> creative ${creative.id} (${creative.storedPath})`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
