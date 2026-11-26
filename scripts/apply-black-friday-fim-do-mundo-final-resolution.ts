/**
 * Owner's directive, 2026-11-26 ("vc tem que aceitar a descricao se for
 * o caso"): Henrique sent final corrected artwork for the 2 remaining
 * flagged products.
 *
 * Slot 11 (Galaxy S24): the new artwork now prints "256 GB" (was
 * "512 GB"), matching the price (R$3.849,00) and the resolved ML
 * page's actual 256GB variant — the divergence is genuinely resolved,
 * reviewNote cleared.
 *
 * Slot 12 (PS5): new artwork is a minor wording revision of the
 * previous one (drops the "De: R$4.000,00" strike-through line, same
 * R$4.596,60 price). Accepted as final per explicit owner instruction
 * to move forward to link generation — reviewNote cleared. This was
 * never a content contradiction (unlike Galaxy S24), only a caution
 * that the price wasn't independently re-verified against the live ML
 * page; the owner is now accepting Henrique's artwork as authoritative.
 */
import { createHash } from "node:crypto";
import { readFileSync, copyFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } from "@/lib/services/black-friday-2026";

const DOWNLOADS = join(homedir(), "Downloads");
const PUBLIC_DIR = join(process.cwd(), "public", "black-friday-fim-do-mundo");

interface Resolution {
  slot: number;
  file: string;
  expectedSha256: string;
  groupKey: string;
  newAdvertisedPrice: number;
}

const RESOLUTIONS: Resolution[] = [
  {
    slot: 11,
    file: "WhatsApp Image 2026-11-26 at 16.10.57.jpeg",
    expectedSha256: "018461668177f85db2ba263b2609dc6c61374ad8a94b5fa3d65658b14fd68649",
    groupKey: "fdm-galaxy-s24",
    newAdvertisedPrice: 3849.0,
  },
  {
    slot: 12,
    file: "WhatsApp Image 2026-11-26 at 16.10.31.jpeg",
    expectedSha256: "d17ec1ee24d79f79b26fca6aa863be159c0d4f9eae24767d8e5dd0dc3a2381d3",
    groupKey: "fdm-ps5-slim-digital",
    newAdvertisedPrice: 4596.6,
  },
];

function importCreative(file: string, expectedSha256: string, groupKey: string) {
  const srcPath = join(DOWNLOADS, file);
  if (!existsSync(srcPath)) throw new Error(`Arquivo não encontrado: ${srcPath}`);
  const bytes = readFileSync(srcPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== expectedSha256) {
    throw new Error(`SHA-256 divergente para ${file}: esperado ${expectedSha256}, obtido ${sha256}`);
  }
  const storedName = `${sha256.slice(0, 16)}.jpeg`;
  const destPath = join(PUBLIC_DIR, storedName);
  if (!existsSync(destPath)) copyFileSync(srcPath, destPath);
  return {
    sha256,
    storedPath: `/black-friday-fim-do-mundo/${storedName}`,
    originalFilename: file,
    groupKey,
    campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN,
  };
}

async function main() {
  for (const r of RESOLUTIONS) {
    const existing = await prisma.blackFridayProduct.findUnique({
      where: { campaign_slotNumber: { campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN, slotNumber: r.slot } },
    });
    if (!existing) throw new Error(`Produto não encontrado para slot ${r.slot}`);
    if (existing.creativeGroupKey !== r.groupKey) {
      throw new Error(
        `groupKey divergente no slot ${r.slot}: produto tem "${existing.creativeGroupKey}", script espera "${r.groupKey}"`,
      );
    }

    const info = importCreative(r.file, r.expectedSha256, r.groupKey);
    const creative = await prisma.blackFridayCreative.upsert({
      where: { sha256: info.sha256 },
      update: {},
      create: info,
    });

    await prisma.blackFridayProduct.update({
      where: { id: existing.id },
      data: {
        selectedCreativeId: creative.id,
        advertisedPrice: r.newAdvertisedPrice,
        reviewNote: null,
      },
    });

    const others = await prisma.blackFridayCreative.findMany({
      where: { campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN, groupKey: r.groupKey, id: { not: creative.id } },
    });
    for (const other of others) {
      await prisma.blackFridayCreative.update({
        where: { id: other.id },
        data: { groupKey: `${r.groupKey}-superseded-20261126` },
      });
    }

    console.log(`Slot ${r.slot}: criativo final aplicado (${creative.id}), reviewNote limpo.`);
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
