/**
 * Owner's directive, 2026-11-26 ("OPERAÇÃO BLACK FRIDAY 2026" +
 * "COMPLEMENTO — IMPORTAÇÃO DOS CRIATIVOS"): one-time, idempotent import of
 * the 34 creative files Henrique sent (2 WhatsApp zips + 1 standalone
 * jpeg, already extracted/hashed/deduplicated into
 * .black-friday-2026-staging/unique/bf01..bf34.jpeg) into 30 real
 * BlackFridayProduct rows + their BlackFridayCreative candidates.
 *
 * Every (name, brand, advertisedPrice) value below was read directly off
 * the creative itself by a human-equivalent visual pass this session —
 * never guessed from file order (owner's explicit rule: "não associe
 * imagens aos links apenas pela ordem dos arquivos"). `mlUrlOriginal` and
 * `affiliateUrl` are intentionally left null — the owner's numbered list
 * of 30 original Mercado Livre links had not arrived yet at import time;
 * this script never invents them. `slotNumber` follows the owner's own
 * preliminary table order (section 2 of the directive) and must be
 * reconciled against the real numbered list once it arrives.
 *
 * Idempotent: re-running after a schema/data fix upserts by sha256
 * (creatives) and slotNumber (products) instead of duplicating rows.
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";

const STAGING_DIR = join(process.cwd(), ".black-friday-2026-staging", "unique");
const PUBLIC_DIR = join(process.cwd(), "public", "black-friday-2026");

interface CreativeCandidate {
  file: string; // bf-numbered filename inside STAGING_DIR
  groupKey: string;
}

interface ProductSeed {
  slotNumber: number;
  name: string;
  brand: string | null;
  advertisedPrice: number;
  candidates: CreativeCandidate[];
  /** Set only when more than one creative/price candidate exists —
   * surfaced verbatim in the panel so the owner resolves it by hand. */
  reviewNote?: string;
}

const PRODUCTS: ProductSeed[] = [
  { slotNumber: 1, name: "Cicaplast Baume B5+ 40ml", brand: "La Roche-Posay", advertisedPrice: 64.37, candidates: [{ file: "bf01.jpeg", groupKey: "cicaplast-b5" }] },
  { slotNumber: 2, name: "Loção Hidratante Corporal 473ml", brand: "CeraVe", advertisedPrice: 77.27, candidates: [{ file: "bf02.jpeg", groupKey: "cerave-locao" }] },
  { slotNumber: 3, name: "Loção Hidratante 1 Litro", brand: "Cetaphil", advertisedPrice: 150.76, candidates: [{ file: "bf03.jpeg", groupKey: "cetaphil-locao" }] },
  { slotNumber: 4, name: "Carrinho de Bebê 3 em 1", brand: "Zavanese", advertisedPrice: 597.81, candidates: [{ file: "bf04.jpeg", groupKey: "zavanese-carrinho" }] },
  { slotNumber: 5, name: "Robô Aspirador e Passa Pano D15 Plus", brand: "Dreame", advertisedPrice: 1808.19, candidates: [{ file: "bf05.jpeg", groupKey: "dreame-d15" }] },
  { slotNumber: 6, name: "Bicicleta Elétrica Dobrável 400W 48V", brand: null, advertisedPrice: 2240.00, candidates: [{ file: "bf06.jpeg", groupKey: "bike-eletrica" }] },
  { slotNumber: 7, name: "Garrafa Térmica Inox 800ml", brand: "Romantic Crown", advertisedPrice: 44.99, candidates: [{ file: "bf07.jpeg", groupKey: "garrafa-termica" }] },
  { slotNumber: 8, name: "Fralda Pants XXG 74 unidades", brand: "Pampers", advertisedPrice: 135.90, candidates: [{ file: "bf08.jpeg", groupKey: "pampers-xxg" }] },
  {
    slotNumber: 9,
    name: "Kit Ferramentas 48V MAX 4 em 1",
    brand: "Strike",
    advertisedPrice: 699.56,
    candidates: [
      { file: "bf09.jpeg", groupKey: "kit-ferramentas-48v" },
      { file: "bf15.jpeg", groupKey: "kit-ferramentas-48v" },
    ],
    reviewNote:
      "Owner flagged 2 preços para este kit: R$ 699,56 (creative bf09) e R$ 621,00 (creative bf15, 12x de R$ 60,05). Confirme qual oferta/link corresponde antes de validar.",
  },
  { slotNumber: 10, name: "Patinete Elétrico Dobrável GM5 P1", brand: "GM5", advertisedPrice: 1159.20, candidates: [{ file: "bf10.jpeg", groupKey: "gm5-p1" }] },
  { slotNumber: 11, name: "Jogo de Panelas 10 Peças", brand: "Tramontina", advertisedPrice: 339.14, candidates: [{ file: "bf11.jpeg", groupKey: "tramontina-panelas" }] },
  { slotNumber: 12, name: "Kit Natalino 88 Enfeites", brand: null, advertisedPrice: 197.90, candidates: [{ file: "bf12.jpeg", groupKey: "kit-natalino" }] },
  { slotNumber: 13, name: "Escova Elétrica Pro Series 1", brand: "Oral-B", advertisedPrice: 101.08, candidates: [{ file: "bf13.jpeg", groupKey: "oral-b-pro1" }] },
  { slotNumber: 14, name: "Cadeira de Escritório Preta", brand: null, advertisedPrice: 115.10, candidates: [{ file: "bf14.jpeg", groupKey: "cadeira-preta" }] },
  {
    slotNumber: 15,
    name: "Furadeira/Parafusadeira 21V com Kit de Acessórios",
    brand: "The Black Tools",
    advertisedPrice: 199.00,
    candidates: [
      { file: "bf20.jpeg", groupKey: "furadeira-black-tools-21v" },
      { file: "bf23.jpeg", groupKey: "furadeira-black-tools-21v" },
    ],
    reviewNote:
      "2 criativos para o mesmo preço (R$ 199,00): bf20 mostra o kit completo de acessórios, bf23 mostra a versão compacta. Escolha qual criativo representa a oferta real antes de validar.",
  },
  {
    slotNumber: 16,
    name: "Escova e Secador de Cabelos 4 em 1",
    brand: "Philco",
    advertisedPrice: 441.60,
    candidates: [
      { file: "bf16.jpeg", groupKey: "secador-philco" },
      { file: "bf27.jpeg", groupKey: "secador-philco" },
    ],
    reviewNote:
      "Owner flagged 2 preços para o secador Philco: R$ 441,60 (creative bf16, 'PSC3500 Profissional') e R$ 413,82 (creative bf27, 'PSC3500 4 em 1'). Confirme qual oferta/link corresponde antes de validar.",
  },
  {
    slotNumber: 17,
    name: "Relógio G-Shock DW-5600BB-1DR",
    brand: "Casio",
    advertisedPrice: 302.00,
    candidates: [
      { file: "bf17.jpeg", groupKey: "casio-g-shock" },
      { file: "bf26.jpeg", groupKey: "casio-g-shock" },
    ],
    reviewNote:
      "2 arquivos de criativo quase idênticos para o mesmo preço (R$ 302,00) — escolha 1 antes de validar (nunca por ordem de arquivo).",
  },
  { slotNumber: 18, name: "Cadeira Ergonômica Geneva B500", brand: null, advertisedPrice: 549.90, candidates: [{ file: "bf18.jpeg", groupKey: "geneva-b500" }] },
  { slotNumber: 19, name: "Chapinha Profissional Gloss", brand: "Taiff", advertisedPrice: 278.99, candidates: [{ file: "bf19.jpeg", groupKey: "taiff-gloss" }] },
  { slotNumber: 20, name: "Câmera de Segurança Wi-Fi com Antenas", brand: "Intelbras", advertisedPrice: 204.76, candidates: [{ file: "bf22.jpeg", groupKey: "intelbras-camera" }] },
  { slotNumber: 21, name: "Loren Shower Eletrônica 5500W", brand: "Lorenzetti", advertisedPrice: 140.64, candidates: [{ file: "bf21.jpeg", groupKey: "lorenzetti-shower" }] },
  { slotNumber: 22, name: "Maleta Completa de Ferramentas", brand: "The Black Tools", advertisedPrice: 479.90, candidates: [{ file: "bf24.jpeg", groupKey: "maleta-ferramentas" }] },
  { slotNumber: 23, name: "Aparador e Barbeador OneBlade 5 em 1", brand: "Philips", advertisedPrice: 130.00, candidates: [{ file: "bf28.jpeg", groupKey: "philips-oneblade" }] },
  { slotNumber: 24, name: "Protetor Solar Facial Clareador FPS 70 50g", brand: "Hidrabene", advertisedPrice: 70.00, candidates: [{ file: "bf25.jpeg", groupKey: "hidrabene-fps70" }] },
  { slotNumber: 25, name: "Whey 100% Pure Chocolate 900g", brand: "Integralmédica", advertisedPrice: 150.35, candidates: [{ file: "bf31.jpeg", groupKey: "whey-integralmedica" }] },
  { slotNumber: 26, name: "Kit 6 Cuecas Boxer", brand: "Lupo", advertisedPrice: 176.61, candidates: [{ file: "bf29.jpeg", groupKey: "lupo-cuecas" }] },
  { slotNumber: 27, name: "Fotoprotetor Facial Fusion Water FPS 60", brand: "ISDIN", advertisedPrice: 59.90, candidates: [{ file: "bf30.jpeg", groupKey: "isdin-fusion-water" }] },
  { slotNumber: 28, name: "Pista e Estacionamento com Carrinhos", brand: null, advertisedPrice: 64.90, candidates: [{ file: "bf34.jpeg", groupKey: "brinquedo-pista" }] },
  { slotNumber: 29, name: "Lavadora de Alta Pressão EasyWash", brand: "Electrolux", advertisedPrice: 263.12, candidates: [{ file: "bf32.jpeg", groupKey: "electrolux-easywash" }] },
  { slotNumber: 30, name: "Árvore de Natal 180cm 1000 Galhos", brand: null, advertisedPrice: 238.90, candidates: [{ file: "bf33.jpeg", groupKey: "arvore-natal" }] },
];

function importCreative(file: string, groupKey: string) {
  const srcPath = join(STAGING_DIR, file);
  const bytes = readFileSync(srcPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const ext = file.split(".").pop() ?? "jpeg";
  const storedName = `${sha256.slice(0, 16)}.${ext}`;
  const destPath = join(PUBLIC_DIR, storedName);
  if (!existsSync(destPath)) copyFileSync(srcPath, destPath);
  return { sha256, storedPath: `/black-friday-2026/${storedName}`, originalFilename: file, groupKey };
}

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });

  let createdCreatives = 0;
  let createdProducts = 0;

  for (const product of PRODUCTS) {
    const creativeRows = [];
    for (const candidate of product.candidates) {
      const info = importCreative(candidate.file, candidate.groupKey);
      const row = await prisma.blackFridayCreative.upsert({
        where: { sha256: info.sha256 },
        update: {},
        create: info,
      });
      creativeRows.push(row);
      createdCreatives += 1;
    }

    // Auto-select only when there is exactly one candidate — an
    // ambiguous group (reviewNote set) is left for the owner to pick in
    // the panel, never auto-resolved here.
    const selectedCreativeId = creativeRows.length === 1 ? creativeRows[0]!.id : null;

    const creativeGroupKey = product.candidates[0]!.groupKey;
    await prisma.blackFridayProduct.upsert({
      where: { campaign_slotNumber: { campaign: "black-friday-2026", slotNumber: product.slotNumber } },
      update: {
        name: product.name,
        brand: product.brand,
        advertisedPrice: product.advertisedPrice,
        reviewNote: product.reviewNote ?? null,
        creativeGroupKey,
        ...(selectedCreativeId ? { selectedCreativeId } : {}),
      },
      create: {
        campaign: "black-friday-2026",
        slotNumber: product.slotNumber,
        name: product.name,
        brand: product.brand,
        advertisedPrice: product.advertisedPrice,
        reviewNote: product.reviewNote ?? null,
        creativeGroupKey,
        selectedCreativeId,
      },
    });
    createdProducts += 1;
  }

  console.log(`Imported ${createdCreatives} creative candidates across ${createdProducts} product slots.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
