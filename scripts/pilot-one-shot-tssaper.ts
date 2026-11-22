import { writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";
import { loadPublicMerchantProduct } from "../lib/queries/public-product";
import { interpretProduct } from "../lib/services/ai-creative-factory/product-interpretation";
import { generateOneShotAd } from "../lib/services/ai-creative-factory/one-shot-ad-generator";
import { recordCreativeSpend } from "../lib/services/ai-creative-factory/budget";
import { renderCatalogClean, toBuffer } from "../lib/services/ai-creative-factory/compositor";

/**
 * Real, single-product, isolated test of the generalized one-shot
 * mechanism (owner's directive, 2026-11-21: "quero um teste completamente
 * isolado, sem executar jobs/vitrine-creative-factory.ts sobre os 30
 * produtos"). Mirrors scripts/pilot-henrique-style.ts's original shape
 * (standalone, one real call, saves to local files) but calls the NOW-
 * GENERALIZED `generateOneShotAd()` instead of a hand-typed prompt —
 * this is the exact real mechanism the main factory will use, not a
 * separate reimplementation.
 *
 * Deliberately does NOT touch VitrineCreative, VitrineSelection, or any
 * other production table — reads the real product (read-only) and
 * writes only local PNG files for manual visual comparison against
 * pilot-result-3.png. No quality-control.ts call (owner's rule: "não
 * executar auditoria visual paga; faremos a primeira avaliação
 * manualmente").
 *
 * The "exactly one paid call" limit is enforced by the SAME real gates
 * already tested in tests/one-shot-ad-generator.test.ts — this script
 * does not reimplement that logic, it depends on it:
 *   VITRINE_CREATIVE_MODE=piloto_autorizado
 *   VITRINE_CREATIVE_PILOT_MAX_CALLS=1
 *   VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST=MLB36520675
 *   VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS=1
 * Missing/wrong env here throws BEFORE any network request — this
 * script has exactly one call site, in a straight line, no loop, so
 * nothing here could retry even if it wanted to.
 */
const EXTERNAL_ID = "MLB36520675";
const SLUG = "pistola-de-pulverizacao-eletrica-para-pintura-hvlp-tssaper-tp550-do-800ml-cor-azul-turquesa-550w";
// Owner's directive, 2026-11-21 ("monte somente uma pasta específica de
// saída... sem montar o projeto inteiro"): writes only here, never a
// bare relative path that could land anywhere in the container's cwd.
// Defaults to a local ./pilot-output/ for anyone running this outside
// the container, but the real run mounts a host folder at this exact
// container path and nothing else.
const OUTPUT_DIR = process.env.PILOT_OUTPUT_DIR ?? "./pilot-output";

async function main() {
  console.log("=== PILOTO REAL — mecanismo one_shot_v1 — Tssaper MLB36520675 ===");
  console.log("(somente leitura no banco; nenhuma escrita em VitrineCreative/VitrineSelection; nenhum XML tocado)");

  const product = await loadPublicMerchantProduct(SLUG);
  if (!product) throw new Error(`Produto não encontrado para o slug real "${SLUG}" — abortando antes de qualquer gasto.`);
  if (product.externalId !== EXTERNAL_ID) {
    throw new Error(`externalId real (${product.externalId}) não é o esperado (${EXTERNAL_ID}) — abortando por segurança.`);
  }
  if (!product.imageUrl || product.currentPrice === null) {
    throw new Error("Dados reais incompletos (foto ou preço ausentes) — abortando antes de qualquer gasto.");
  }

  const hasConfirmedDiscount = product.discountPercent !== null && product.discountPercent > 0;
  const profile = interpretProduct({
    title: product.title,
    brand: product.brand,
    categoryHint: product.categoryId,
    currentPrice: product.currentPrice,
    referencePrice: product.referencePrice,
    hasConfirmedDiscount,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isSeasonalEvent: null,
  });
  const benefits = profile.benefits.map((b) => b.text);

  console.log("--- Dados reais confirmados ---");
  console.log("Título:", product.title);
  console.log("Marca:", product.brand);
  console.log("Preço atual real:", product.currentPrice, "| Preço anterior real:", product.referencePrice, "| desconto confirmado:", hasConfirmedDiscount);
  console.log("Benefícios reais extraídos (interpretProduct, zero custo):", benefits);
  console.log("Foto real:", product.imageUrl);

  const photoRes = await fetch(product.imageUrl);
  if (!photoRes.ok) throw new Error(`Falha ao buscar a foto real do produto: HTTP ${photoRes.status}`);
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
  const photoContentType = photoRes.headers.get("content-type") ?? "image/jpeg";

  console.log("");
  console.log("=== CHAMANDO generateOneShotAd — 1 ÚNICA CHAMADA PAGA REAL ===");
  const result = await generateOneShotAd({
    externalId: EXTERNAL_ID,
    title: product.title,
    brand: product.brand,
    productPhoto: photoBuffer,
    productPhotoContentType: photoContentType,
    currentPrice: product.currentPrice,
    referencePrice: product.referencePrice,
    hasConfirmedDiscount,
    benefits,
    backgroundStyle: profile.backgroundStyle,
    colorPalette: profile.colorPalette,
    ambientation: profile.ambientation,
  });

  console.log("Custo real efetivo desta geração: US$", result.costUsd.toFixed(4));
  await recordCreativeSpend({
    amountUsd: result.costUsd,
    note: "PILOTO REAL one_shot_v1 (isolado) — Tssaper MLB36520675, para comparação manual com pilot-result-3",
  });

  const rawPath = path.join(OUTPUT_DIR, "pilot-one-shot-tssaper-raw.png");
  const finalPath = path.join(OUTPUT_DIR, "pilot-one-shot-tssaper-final.png");

  writeFileSync(rawPath, result.imageBuffer);
  console.log(`Imagem bruta (1024x1536, sem corte) salva em ${rawPath}`);

  const dataUri = `data:image/png;base64,${result.imageBuffer.toString("base64")}`;
  const cropped = await toBuffer(renderCatalogClean({ aiBaseImageDataUri: dataUri }));
  writeFileSync(finalPath, cropped);
  console.log(`Imagem final 1080x1350 (mesmo corte usado em todo o projeto) salva em ${finalPath}`);

  console.log("");
  console.log("=== Nenhuma linha gravada em VitrineCreative. Nenhuma checagem visual paga executada. Nenhum XML tocado. ===");
  console.log("Compare manualmente pilot-one-shot-tssaper-final.png com pilot-result-3.png antes de qualquer outra decisão.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
