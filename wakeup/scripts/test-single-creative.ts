import { prisma } from "@/lib/db";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { checkCreativeBudget, recordCreativeSpend } from "@/lib/services/ai-creative-factory/budget";
import { buildCreativePrompt } from "@/lib/services/ai-creative-factory/prompt-builder";
import { generateCreativeBase } from "@/lib/services/ai-creative-factory/openai-image-client";
import { runQualityControl } from "@/lib/services/ai-creative-factory/quality-control";
import { renderCatalogClean, renderAdOverlay, toBuffer } from "@/lib/services/ai-creative-factory/compositor";
import { saveAiBase, saveFinalRender } from "@/lib/services/ai-creative-factory/creative-image-store";
import { interpretProduct } from "@/lib/services/ai-creative-factory/product-interpretation";

// Controlled single-product test (owner's explicit authorization,
// 2026-11-20: "crie imagem de um produto apenas para não gastar
// créditos desnecessariamente") — exercises the NEW benefit-aware
// generation path end to end, one real paid call, never the full
// 30-product batch.
const MERCHANT_LISTING_ID = process.argv[2];
if (!MERCHANT_LISTING_ID) {
  console.error("Usage: tsx scripts/test-single-creative.ts <merchantListingId>");
  process.exit(1);
}

async function main() {
  // Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
  // Inteligentes"): merchantListingId is no longer globally unique on
  // this table — findFirst, same reasoning as app/api/vitrine/creative/
  // [merchantListingId]/route.ts.
  const selection = await prisma.vitrineSelection.findFirst({
    where: { merchantListingId: MERCHANT_LISTING_ID },
    select: {
      merchantListingId: true,
      scoreBreakdown: true,
      merchantListing: { select: { canonicalProduct: { select: { publicSlug: true, categoryId: true } } } },
    },
  });
  if (!selection) throw new Error("Selection not found or not active");
  const slug = selection.merchantListing.canonicalProduct?.publicSlug;
  if (!slug) throw new Error("No public slug");
  const product = await loadPublicMerchantProduct(slug);
  if (!product || !product.imageUrl || product.currentPrice === null) throw new Error("Incomplete product data");

  const breakdown = selection.scoreBreakdown as { matchedEventName?: string | null } | null;

  const profile = interpretProduct({
    title: product.title,
    brand: product.brand,
    categoryHint: selection.merchantListing.canonicalProduct?.categoryId ?? null,
    currentPrice: product.currentPrice,
    referencePrice: product.referencePrice,
    hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
    rating: product.rating,
    reviewCount: product.reviewCount,
    isSeasonalEvent: breakdown?.matchedEventName ?? null,
  });

  console.log("=== PERFIL CRIATIVO REAL ===");
  console.log(JSON.stringify(profile, null, 2));

  const budget = await checkCreativeBudget();
  console.log("=== ORÇAMENTO ===", JSON.stringify(budget));
  if (!budget.allowed) {
    console.error("Budget not allowed:", budget.reason);
    process.exit(1);
  }

  const realBenefitTexts = profile.benefits.map((b) => b.text);
  const promptInputs = {
    title: product.title,
    brand: product.brand,
    categoryHint: selection.merchantListing.canonicalProduct?.categoryId ?? null,
    currentPrice: product.currentPrice,
    referencePrice: product.referencePrice,
    hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
    rating: product.rating,
    soldQuantityLabel: null,
    impulseFit: "indeterminado" as const,
    isSeasonalEvent: breakdown?.matchedEventName ?? null,
    benefits: realBenefitTexts,
  };
  const promptText = buildCreativePrompt(promptInputs);
  console.log("=== PROMPT REAL ENVIADO À IA ===");
  console.log(promptText);

  const photoResponse = await fetch(product.imageUrl);
  const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
  const photoContentType = photoResponse.headers.get("content-type") ?? "image/jpeg";

  console.log("=== CHAMANDO A API REAL DA OPENAI (1 chamada paga) ===");
  const generation = await generateCreativeBase({ productPhoto: photoBuffer, productPhotoContentType: photoContentType, prompt: promptText });
  await recordCreativeSpend({ amountUsd: generation.costUsd, note: `TESTE CONTROLADO — ${product.title.slice(0, 60)}` });
  console.log("Custo real desta geração:", generation.costUsd, "USD");

  const qc = await runQualityControl({
    generatedImageBuffer: generation.imageBuffer,
    expectedWidth: 1024,
    expectedHeight: 1536,
    originalPhotoBase64: photoBuffer.toString("base64"),
    title: product.title,
  });
  if (qc.visionCheckCostUsd) await recordCreativeSpend({ amountUsd: qc.visionCheckCostUsd, note: "Checagem visual — teste controlado" });
  console.log("=== RESULTADO DA AUDITORIA VISUAL ===", JSON.stringify(qc));

  const latest = await prisma.vitrineCreative.findFirst({
    where: { merchantListingId: MERCHANT_LISTING_ID, kind: "ad_overlay" },
    orderBy: { version: "desc" },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  const aiBaseFileName = saveAiBase(MERCHANT_LISTING_ID, nextVersion, generation.imageBuffer);
  const aiBaseDataUri = `data:image/png;base64,${generation.imageBuffer.toString("base64")}`;

  if (qc.status !== "approved") {
    await prisma.vitrineCreative.create({
      data: {
        merchantListingId: MERCHANT_LISTING_ID,
        kind: "ad_overlay",
        version: nextVersion,
        originalPhotoUrl: product.imageUrl,
        aiBaseImageUrl: aiBaseFileName,
        finalImageUrl: product.imageUrl,
        promptInputs,
        promptText,
        model: generation.model,
        costUsd: generation.costUsd,
        qualityStatus: qc.status,
        qualityNotes: qc.notes,
        publishedAt: null,
      },
    });
    console.log("REPROVADO — não publicado. Motivo:", qc.notes);
    await prisma.$disconnect();
    return;
  }

  const [cleanPng, overlayPng] = await Promise.all([
    toBuffer(renderCatalogClean({ aiBaseImageDataUri: aiBaseDataUri })),
    toBuffer(renderAdOverlay({
      aiBaseImageDataUri: aiBaseDataUri,
      title: product.title,
      brand: product.brand,
      currentPrice: product.currentPrice,
      referencePrice: product.referencePrice,
      hasConfirmedDiscount: promptInputs.hasConfirmedDiscount,
      benefits: realBenefitTexts,
    })),
  ]);
  const cleanUrl = saveFinalRender(MERCHANT_LISTING_ID, "catalog_clean", nextVersion, cleanPng);
  const overlayUrl = saveFinalRender(MERCHANT_LISTING_ID, "ad_overlay", nextVersion, overlayPng);

  await prisma.$transaction([
    prisma.vitrineCreative.updateMany({ where: { merchantListingId: MERCHANT_LISTING_ID }, data: { publishedAt: null } }),
    prisma.vitrineCreative.create({
      data: {
        merchantListingId: MERCHANT_LISTING_ID, kind: "catalog_clean", version: nextVersion,
        originalPhotoUrl: product.imageUrl, aiBaseImageUrl: aiBaseFileName, finalImageUrl: cleanUrl,
        promptInputs, promptText, model: generation.model, costUsd: generation.costUsd,
        qualityStatus: "approved", qualityNotes: qc.notes, publishedAt: new Date(),
      },
    }),
    prisma.vitrineCreative.create({
      data: {
        merchantListingId: MERCHANT_LISTING_ID, kind: "ad_overlay", version: nextVersion,
        originalPhotoUrl: product.imageUrl, aiBaseImageUrl: aiBaseFileName, finalImageUrl: overlayUrl,
        promptInputs, promptText, model: generation.model, costUsd: 0,
        qualityStatus: "approved", qualityNotes: qc.notes, publishedAt: new Date(),
      },
    }),
  ]);

  console.log("=== APROVADO ===");
  console.log("catalog_clean:", cleanUrl);
  console.log("ad_overlay:", overlayUrl);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exitCode = 1;
});
