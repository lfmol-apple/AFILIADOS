/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO"): imports the 15 creatives Henrique sent (~/Downloads/
 * Black_Friday_Fim_do_Mundo.zip, extracted to
 * .bf-fim-do-mundo-staging/unique/fdm01..15.jpeg — gitignored, same
 * staging convention as the first campaign) and the 15 official
 * reference links, matching each creative to its real product by
 * actually reading the creative (brand/model/spec) and resolving the
 * link (catalog id + title) — never by file/link order, confirmed
 * 1:1 only after both were independently identified and cross-checked
 * by product name.
 *
 * Every mlUrlOriginal below is the owner's own original reference link
 * (mattWord=leomol, the owner's existing general tag — confirmed NOT a
 * foreign affiliate's) — never the final affiliateUrl, which the owner
 * generates manually with the "blackfridayfimdomundo" tag and pastes in
 * the panel. advertisedPrice is exactly what's printed on the creative;
 * reviewNote records a real, observed divergence against the resolved
 * page's own title — never invented, never silently resolved here.
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } from "@/lib/services/black-friday-2026";

const STAGING_DIR = join(process.cwd(), ".bf-fim-do-mundo-staging", "unique");
const PUBLIC_DIR = join(process.cwd(), "public", "black-friday-fim-do-mundo");

interface ProductSeed {
  slot: number;
  name: string;
  brand: string | null;
  advertisedPrice: number;
  file: string;
  groupKey: string;
  mlUrlOriginal: string;
  resolvedExternalId: string;
  reviewNote?: string;
}

const PRODUCTS: ProductSeed[] = [
  { slot: 1, name: "Notebook Gamer Nitro V15 Intel i7 RTX 4050 8GB 512GB SSD", brand: "Acer", advertisedPrice: 5439.99, file: "fdm01.jpeg", groupKey: "fdm-notebook-acer-nitro-v15", mlUrlOriginal: "https://meli.la/1DtNStD", resolvedExternalId: "MLB72018722" },
  { slot: 2, name: "Drone Mini 5 Pro Fly More Plus com Controle RC 2", brand: "DJI", advertisedPrice: 9035.99, file: "fdm02.jpeg", groupKey: "fdm-drone-dji-mini5-pro", mlUrlOriginal: "https://meli.la/1kAkoyb", resolvedExternalId: "MLB56721548" },
  { slot: 3, name: "Projetor Multimídia Powerlite E24 3.600 Lúmens XGA", brand: "Epson", advertisedPrice: 3229.90, file: "fdm03.jpeg", groupKey: "fdm-projetor-epson-e24", mlUrlOriginal: "https://meli.la/1nv7RF5", resolvedExternalId: "MLB61372830" },
  { slot: 4, name: "Impressora 3D A1 FDM Aberta", brand: "Bambu Lab", advertisedPrice: 2697.05, file: "fdm04.jpeg", groupKey: "fdm-impressora3d-bambulab-a1", mlUrlOriginal: "https://meli.la/2MQKCai", resolvedExternalId: "MLB45248118" },
  {
    slot: 5, name: "Smart TV PRO 65\" 4K Ultra HD AI", brand: "LG", advertisedPrice: 3599.00, file: "fdm05.jpeg", groupKey: "fdm-tv-lg-65-4k", mlUrlOriginal: "https://meli.la/2kjohnN", resolvedExternalId: "MLB75681241",
    reviewNote: "Preço anunciado no criativo (R$ 3.599,00) parece divergir do preço atual lido na página (em torno de R$ 2.896, formato truncado sem centavos) — confirme antes de validar.",
  },
  { slot: 6, name: "Geladeira Frost Free Duplex Inox 385 Litros BRM46MK", brand: "Brastemp", advertisedPrice: 2679.38, file: "fdm06.jpeg", groupKey: "fdm-geladeira-brastemp-385l", mlUrlOriginal: "https://meli.la/16whCNL", resolvedExternalId: "MLB64307757" },
  { slot: 7, name: "Lava e Seca Front Load 13kg Smart AI Control WD13FG6B34BX/AZ", brand: "Samsung", advertisedPrice: 4439.00, file: "fdm07.jpeg", groupKey: "fdm-lavaeseca-samsung-13kg", mlUrlOriginal: "https://meli.la/27JE2LC", resolvedExternalId: "MLB60385574" },
  {
    slot: 8, name: "Lavadora de Roupas Wave Agitator 13kg Branca", brand: "Midea", advertisedPrice: 1829.39, file: "fdm08.jpeg", groupKey: "fdm-lavadora-midea-13kg", mlUrlOriginal: "https://meli.la/1G7pZSe", resolvedExternalId: "MLB45804798",
    reviewNote: "Preço anunciado (R$ 1.829,39) ~10% acima do preço atual lido na página (R$ 1.647) — confirme antes de validar.",
  },
  {
    slot: 9, name: "Ar Condicionado Split WindFree AI Pro 12.000 BTUs Frio", brand: "Samsung", advertisedPrice: 3072.86, file: "fdm09.jpeg", groupKey: "fdm-ar-split-samsung-windfree", mlUrlOriginal: "https://meli.la/1xe94co", resolvedExternalId: "MLB76156293",
    reviewNote: "Preço anunciado (R$ 3.072,86) ~9% acima do preço atual lido na página (R$ 2.799) — confirme antes de validar.",
  },
  { slot: 10, name: "Ar Condicionado Portátil Smart 700 12.000 BTUs Quente e Frio", brand: "KABUM!", advertisedPrice: 1869.99, file: "fdm10.jpeg", groupKey: "fdm-ar-portatil-kabum-700", mlUrlOriginal: "https://meli.la/2u5TrXk", resolvedExternalId: "MLB80139594" },
  {
    slot: 11, name: "Galaxy S24 Galaxy AI 512GB 8GB RAM Preto", brand: "Samsung", advertisedPrice: 4399.99, file: "fdm11.jpeg", groupKey: "fdm-galaxy-s24", mlUrlOriginal: "https://meli.la/2zPQRqw", resolvedExternalId: "MLB29699966",
    reviewNote: "ATENÇÃO — divergência de variante: o criativo anuncia 512GB, a página resolvida mostra a variante de 256GB (R$ 3.849, vs R$ 4.399,99 anunciado). Confirme qual variante corresponde ao link antes de validar — não presuma.",
  },
  { slot: 12, name: "Console PlayStation 5 Slim Edição Digital 825GB Branco", brand: "Sony", advertisedPrice: 4000.00, file: "fdm12.jpeg", groupKey: "fdm-ps5-slim-digital", mlUrlOriginal: "https://meli.la/27kfRW9", resolvedExternalId: "MLB29001054" },
  { slot: 13, name: "Fritadeira Sem Óleo Air Fryer AFN-40-BI 4L 1500W", brand: "Mondial", advertisedPrice: 323.00, file: "fdm13.jpeg", groupKey: "fdm-airfryer-mondial-4l", mlUrlOriginal: "https://meli.la/2z3F47y", resolvedExternalId: "MLB19635464" },
  {
    slot: 14, name: "Guarda-roupa Easy Slim 8 Portas com 2 Espelhos", brand: "Móveis Lopas", advertisedPrice: 794.92, file: "fdm14.jpeg", groupKey: "fdm-guardaroupa-lopas-8portas", mlUrlOriginal: "https://meli.la/1rLrspj", resolvedExternalId: "MLB51396300",
    reviewNote: "Preço anunciado (R$ 794,92) abaixo do preço atual lido na página (R$ 996,31, ~25% maior) — confirme antes de validar.",
  },
  { slot: 15, name: "Esteira Ergométrica Elétrica Dobrável Residencial Cardio", brand: null, advertisedPrice: 689.99, file: "fdm15.jpeg", groupKey: "fdm-esteira-eletrica-dobravel", mlUrlOriginal: "https://meli.la/2PcyYU6", resolvedExternalId: "MLB77671293" },
];

function importCreative(file: string, groupKey: string) {
  const srcPath = join(STAGING_DIR, file);
  const bytes = readFileSync(srcPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const storedName = `${sha256.slice(0, 16)}.jpeg`;
  const destPath = join(PUBLIC_DIR, storedName);
  if (!existsSync(destPath)) copyFileSync(srcPath, destPath);
  return { sha256, storedPath: `/black-friday-fim-do-mundo/${storedName}`, originalFilename: file, groupKey, campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN };
}

async function main() {
  mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const p of PRODUCTS) {
    const info = importCreative(p.file, p.groupKey);
    const creative = await prisma.blackFridayCreative.upsert({
      where: { sha256: info.sha256 },
      update: {},
      create: info,
    });

    await prisma.blackFridayProduct.upsert({
      where: { campaign_slotNumber: { campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN, slotNumber: p.slot } },
      update: {
        name: p.name,
        brand: p.brand,
        advertisedPrice: p.advertisedPrice,
        creativeGroupKey: p.groupKey,
        mlUrlOriginal: p.mlUrlOriginal,
        resolvedProductUrl: `https://www.mercadolivre.com.br/p/${p.resolvedExternalId}`,
        resolvedExternalId: p.resolvedExternalId,
        resolvedAt: new Date(),
        reviewNote: p.reviewNote ?? null,
        attributionTag: "blackfridayfimdomundo",
        selectedCreativeId: creative.id,
      },
      create: {
        campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN,
        slotNumber: p.slot,
        name: p.name,
        brand: p.brand,
        advertisedPrice: p.advertisedPrice,
        creativeGroupKey: p.groupKey,
        mlUrlOriginal: p.mlUrlOriginal,
        resolvedProductUrl: `https://www.mercadolivre.com.br/p/${p.resolvedExternalId}`,
        resolvedExternalId: p.resolvedExternalId,
        resolvedAt: new Date(),
        reviewNote: p.reviewNote ?? null,
        attributionTag: "blackfridayfimdomundo",
        selectedCreativeId: creative.id,
      },
    });
  }

  console.log(`Importados ${PRODUCTS.length} produtos e criativos da campanha Black Friday Fim do Mundo.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
