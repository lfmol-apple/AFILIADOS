/**
 * Owner's directive, 2026-11-26 ("Agora os criativos corretos para
 * resolução da pendência anterior"): Henrique sent 6 replacement
 * creative artworks (confirmed by the owner as real, from Henrique —
 * not AI-generated) for the campaign-2 products flagged with a price
 * divergence, plus a new artwork for the PS5 (slot 12, not previously
 * flagged). Source files: ~/Downloads/WhatsApp Image 2026-11-26 at
 * 15.3x/15.4x*.jpeg — SHA-256 verified below for each.
 *
 * This does NOT delete or touch the original raw-photo creative for any
 * slot — it adds the new artwork as a second BlackFridayCreative row
 * (same campaign + groupKey as the existing product) and repoints
 * `selectedCreativeId` to it, so the old creative stays in the system
 * for audit/history. `advertisedPrice` is updated to the price printed
 * on the NEW artwork (the thing we show to customers now).
 *
 * Slot 11 (Galaxy S24) is the one EXCEPTION, per explicit owner
 * instruction ("mantenha a divergência 512 GB versus 256 GB
 * bloqueada"): the new artwork still prints "512 GB" while its price
 * (R$3.849,00) matches the 256GB variant on the resolved ML page — the
 * underlying problem is NOT resolved by this artwork, so its
 * reviewNote is rewritten to say so explicitly, NOT cleared.
 *
 * Owner's follow-up directive, same day ("vc deve substituir os errados
 * pelos novos"): the old (wrong) creative must stop appearing as a
 * selectable candidate for these products — otherwise the gallery shows
 * 2 candidates per slot and reports "aguardando escolha" even though a
 * selection was made. We never delete the old row/file (audit trail,
 * SHA-256 preserved forever) — we just rename its groupKey to
 * `<original>-superseded-20261126`, which drops it out of
 * loadBlackFridayPanel's candidate grouping for this product.
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
  /** null clears reviewNote (divergence resolved); a string replaces it. */
  reviewNote: string | null;
}

const RESOLUTIONS: Resolution[] = [
  {
    slot: 5,
    file: "WhatsApp Image 2026-11-26 at 15.44.21.jpeg",
    expectedSha256: "c7e6140c807343905bbcd8347609241c8f5b24bb844852c8ee95b812463d332e",
    groupKey: "fdm-tv-lg-65-4k",
    newAdvertisedPrice: 2869.0,
    reviewNote: null,
  },
  {
    slot: 8,
    file: "WhatsApp Image 2026-11-26 at 15.44.21 (1).jpeg",
    expectedSha256: "dc38f5cff31406ac92dbd99ab682d125407f1305477c0ef6c47d3522983693ee",
    groupKey: "fdm-lavadora-midea-13kg",
    newAdvertisedPrice: 1647.0,
    reviewNote: null,
  },
  {
    slot: 9,
    file: "WhatsApp Image 2026-11-26 at 15.44.21 (2).jpeg",
    expectedSha256: "dd5620052f01dbf1c8e665ced8697f5c5ad98b73c36b29ec342c899caa35ac8a",
    groupKey: "fdm-ar-split-samsung-windfree",
    newAdvertisedPrice: 2799.0,
    reviewNote: null,
  },
  {
    slot: 14,
    file: "WhatsApp Image 2026-11-26 at 15.44.22.jpeg",
    expectedSha256: "31c795d908700f06e51b4d69bc16d2a2c9576fe3a204b2ef11987a32a029cb92",
    groupKey: "fdm-guardaroupa-lopas-8portas",
    newAdvertisedPrice: 996.31,
    reviewNote: null,
  },
  {
    slot: 11,
    file: "WhatsApp Image 2026-11-26 at 15.44.22 (1).jpeg",
    expectedSha256: "bd4a6737726e0eb10c04fd4b6b0619f75f4936f6e43dd8fd0a69d2ff526920a6",
    groupKey: "fdm-galaxy-s24",
    newAdvertisedPrice: 3849.0,
    reviewNote:
      "ATENÇÃO — NÃO RESOLVIDO: o novo criativo enviado pelo Henrique ainda anuncia 512GB, mas o preço impresso (R$ 3.849,00) é o da variante de 256GB na página resolvida. Confirme manualmente a variante correta antes de validar — não presuma.",
  },
  {
    slot: 12,
    file: "WhatsApp Image 2026-11-26 at 15.32.38.jpeg",
    expectedSha256: "a0c695cca0a51a2ba1c64b10bd125b6a30c87c57fd3c7edbb2b1b4c7b9b6b49a",
    groupKey: "fdm-ps5-slim-digital",
    // Not previously flagged — new artwork simply prints a different
    // price (R$4.596,60) than the original (R$4.000,00). Not
    // independently re-verified against the live ML page here.
    newAdvertisedPrice: 4596.6,
    reviewNote:
      "Novo criativo do Henrique altera o preço impresso de R$ 4.000,00 para R$ 4.596,60 — não houve reverificação independente do preço atual na página do Mercado Livre. Confirme antes de validar.",
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
        reviewNote: r.reviewNote,
      },
    });

    // Retire every other candidate sharing this product's groupKey (the
    // old, wrong creative) so it stops showing up as a selectable
    // alternative — never deleted, just moved out of the active group.
    const others = await prisma.blackFridayCreative.findMany({
      where: { campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN, groupKey: r.groupKey, id: { not: creative.id } },
    });
    for (const other of others) {
      await prisma.blackFridayCreative.update({
        where: { id: other.id },
        data: { groupKey: `${r.groupKey}-superseded-20261126` },
      });
    }

    console.log(
      `Slot ${r.slot}: criativo atualizado (${creative.id}), advertisedPrice=${r.newAdvertisedPrice}, reviewNote=${
        r.reviewNote ? "MANTIDO/ATUALIZADO" : "LIMPO (divergência resolvida)"
      }`,
    );
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
