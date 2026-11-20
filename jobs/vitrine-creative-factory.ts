import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { checkCreativeBudget, recordCreativeSpend } from "@/lib/services/ai-creative-factory/budget";
import { buildCreativePrompt } from "@/lib/services/ai-creative-factory/prompt-builder";
import { generateCreativeBase, OpenAiImageNotConfiguredError, AI_GENERATION_SIZE } from "@/lib/services/ai-creative-factory/openai-image-client";
import { runQualityControl } from "@/lib/services/ai-creative-factory/quality-control";
import { renderCatalogClean, renderAdOverlay, toBuffer } from "@/lib/services/ai-creative-factory/compositor";
import type { ImpulseFitHypothesis } from "@/lib/services/commercial-intelligence/ad-potential-hypothesis";
import { saveAiBase, readAiBase, saveFinalRender } from "@/lib/services/ai-creative-factory/creative-image-store";
import { interpretProduct } from "@/lib/services/ai-creative-factory/product-interpretation";

/**
 * Fábrica Inteligente de Criativos — orchestration job (owner's
 * authorization, 2026-11-19). Runs after VITRINE_RENEW in the cron
 * pipeline (scripts/run-vitrine-cron.sh) — a selection must already be
 * real and current before spending anything generating creative for it.
 *
 * Regeneration policy (owner's explicit cost-control rule, section 7):
 *  - No creative exists yet for this product → full AI generation.
 *  - Latest creative was rejected by quality control → full regeneration.
 *  - Category or matched seasonal event changed since the last AI base
 *    → full regeneration (a real compositional reason, not cosmetic).
 *  - ONLY the price changed → re-render just the "ad_overlay" kind from
 *    the EXISTING cached AI base image, zero new OpenAI image-edit call.
 *    "catalog_clean" never needs re-rendering for a price change — it
 *    never carries price to begin with.
 *  - Nothing changed and a current approved creative already exists →
 *    skip entirely.
 */
export async function runVitrineCreativeFactoryJob() {
  return runJob("VITRINE_CREATIVE_FACTORY", async (ctx) => {
    const active = await prisma.vitrineSelection.findMany({
      where: { status: "ACTIVE" },
      select: {
        merchantListingId: true,
        scoreBreakdown: true,
        merchantListing: {
          select: {
            canonicalProduct: { select: { publicSlug: true, title: true, brand: true, categoryId: true } },
          },
        },
      },
    });

    let generated = 0;
    let priceOnlyUpdates = 0;
    let skipped = 0;
    let rejected = 0;

    for (const selection of active) {
      const slug = selection.merchantListing.canonicalProduct?.publicSlug;
      if (!slug) {
        skipped += 1;
        continue;
      }
      const product = await loadPublicMerchantProduct(slug).catch(() => null);
      if (!product || !product.imageUrl || product.currentPrice === null) {
        skipped += 1;
        continue;
      }

      const breakdown = selection.scoreBreakdown as {
        matchedEventName?: string | null;
        adPotentialHypothesis?: { impulseFit?: string };
      } | null;

      // Owner's requirement, 2026-11-20 ("Evolução da Fábrica de
      // Criativos" / "Automação Integral"): a mandatory, deterministic
      // interpretation pass BEFORE any generation or re-render — real,
      // traceable benefits only (confirmed discount, real rating, or a
      // spec the seller already wrote in the real title), never
      // invented. Free (no API call), computed every cycle so BOTH the
      // zero-cost price-only path and the full-generation path below
      // show the same real benefits.
      const creativeProfile = interpretProduct({
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
      const realBenefitTexts = creativeProfile.benefits.map((b) => b.text);

      const latestAiBase = await prisma.vitrineCreative.findFirst({
        where: { merchantListingId: selection.merchantListingId, kind: "ad_overlay" },
        orderBy: { version: "desc" },
      });

      const promptInputsPrev = latestAiBase?.promptInputs as Record<string, unknown> | undefined;
      const categoryChanged = promptInputsPrev && promptInputsPrev.categoryHint !== (selection.merchantListing.canonicalProduct?.categoryId ?? null);
      const eventChanged = promptInputsPrev && promptInputsPrev.isSeasonalEvent !== (breakdown?.matchedEventName ?? null);
      const priceChangedOnly =
        latestAiBase &&
        latestAiBase.qualityStatus === "approved" &&
        !categoryChanged &&
        !eventChanged &&
        promptInputsPrev?.currentPrice !== product.currentPrice;

      const needsFullGeneration = !latestAiBase || latestAiBase.qualityStatus === "rejected" || categoryChanged || eventChanged;

      if (!needsFullGeneration && !priceChangedOnly) {
        skipped += 1;
        continue; // nothing relevant changed, current creative already approved
      }

      const nextVersion = (latestAiBase?.version ?? 0) + 1;

      if (priceChangedOnly && latestAiBase) {
        // Price-only path — zero new OpenAI call, owner's explicit rule.
        const aiBaseBytes = readAiBase(selection.merchantListingId, latestAiBase.version);
        if (!aiBaseBytes) {
          // Cached file lost (e.g. volume wiped) — must fall through to full regeneration.
        } else {
          const dataUri = `data:image/png;base64,${aiBaseBytes.toString("base64")}`;
          const overlayPng = await toBuffer(
            renderAdOverlay({
              aiBaseImageDataUri: dataUri,
              title: product.title,
              currentPrice: product.currentPrice,
              referencePrice: product.referencePrice,
              hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
              benefits: realBenefitTexts,
            }),
          );
          const finalUrl = saveFinalRender(selection.merchantListingId, "ad_overlay", nextVersion, overlayPng);
          await prisma.vitrineCreative.create({
            data: {
              merchantListingId: selection.merchantListingId,
              kind: "ad_overlay",
              version: nextVersion,
              originalPhotoUrl: product.imageUrl,
              aiBaseImageUrl: latestAiBase.aiBaseImageUrl,
              finalImageUrl: finalUrl,
              promptInputs: { ...(promptInputsPrev ?? {}), currentPrice: product.currentPrice },
              model: latestAiBase.model,
              costUsd: 0,
              qualityStatus: "approved", // price swap on an already-approved base never needs re-review
              qualityNotes: "Atualização de preço — reaproveitou a composição de IA já aprovada, sem nova geração.",
              publishedAt: new Date(),
            },
          });
          await prisma.vitrineCreative.updateMany({
            where: { merchantListingId: selection.merchantListingId, kind: "ad_overlay", version: { lt: nextVersion } },
            data: { publishedAt: null },
          });
          priceOnlyUpdates += 1;
          continue;
        }
      }

      // Full generation path — a real paid call.
      const budget = await checkCreativeBudget();
      if (!budget.allowed) {
        logger.warn("vitrine_creative_factory.budget_exceeded", { reason: budget.reason, merchantListingId: selection.merchantListingId });
        ctx.metadata.budgetStoppedEarly = budget.reason;
        break; // stop the whole run, never partially spend past the ceiling
      }

      const photoResponse = await fetch(product.imageUrl).catch(() => null);
      if (!photoResponse || !photoResponse.ok) {
        skipped += 1;
        continue;
      }
      const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
      const photoContentType = photoResponse.headers.get("content-type") ?? "image/jpeg";

      const promptInputs = {
        title: product.title,
        brand: product.brand,
        categoryHint: selection.merchantListing.canonicalProduct?.categoryId ?? null,
        currentPrice: product.currentPrice,
        referencePrice: product.referencePrice,
        hasConfirmedDiscount: product.discountPercent !== null && product.discountPercent > 0,
        rating: product.rating,
        soldQuantityLabel: null, // real bucket label plumbing lives in sales-evidence.ts; not yet threaded through MerchantListingFacts — left null rather than guessed
        impulseFit: (breakdown?.adPotentialHypothesis?.impulseFit ?? "indeterminado") as ImpulseFitHypothesis,
        isSeasonalEvent: breakdown?.matchedEventName ?? null,
        benefits: realBenefitTexts,
      };
      const promptText = buildCreativePrompt(promptInputs);

      let generation;
      try {
        generation = await generateCreativeBase({ productPhoto: photoBuffer, productPhotoContentType: photoContentType, prompt: promptText });
      } catch (err) {
        if (err instanceof OpenAiImageNotConfiguredError) {
          ctx.metadata.stoppedReason = "openai_not_configured";
          break; // the whole feature is off — no point looping further
        }
        logger.error("vitrine_creative_factory.generation_failed", { merchantListingId: selection.merchantListingId, message: String(err) });
        ctx.counters.errors += 1;
        continue;
      }

      await recordCreativeSpend({ amountUsd: generation.costUsd, note: `Geração de criativo — ${product.title.slice(0, 60)}` });

      const qc = await runQualityControl({
        generatedImageBuffer: generation.imageBuffer,
        expectedWidth: 1024,
        expectedHeight: 1536,
        originalPhotoBase64: photoBuffer.toString("base64"),
        title: product.title,
      });
      if (qc.visionCheckCostUsd) {
        await recordCreativeSpend({ amountUsd: qc.visionCheckCostUsd, note: "Checagem visual de qualidade" });
      }

      const aiBaseFileName = saveAiBase(selection.merchantListingId, nextVersion, generation.imageBuffer);
      const aiBaseDataUri = `data:image/png;base64,${generation.imageBuffer.toString("base64")}`;

      if (qc.status !== "approved") {
        await prisma.vitrineCreative.create({
          data: {
            merchantListingId: selection.merchantListingId,
            kind: "ad_overlay",
            version: nextVersion,
            originalPhotoUrl: product.imageUrl,
            aiBaseImageUrl: aiBaseFileName,
            finalImageUrl: product.imageUrl, // never publish a rejected render — fall back to the real photo
            promptInputs,
            promptText,
            model: generation.model,
            costUsd: generation.costUsd,
            qualityStatus: qc.status,
            qualityNotes: qc.notes,
            publishedAt: null,
          },
        });
        rejected += 1;
        ctx.counters.errors += 1;
        continue;
      }

      const [cleanPng, overlayPng] = await Promise.all([
        toBuffer(renderCatalogClean({ aiBaseImageDataUri: aiBaseDataUri })),
        toBuffer(
          renderAdOverlay({
            aiBaseImageDataUri: aiBaseDataUri,
            title: product.title,
            currentPrice: product.currentPrice,
            referencePrice: product.referencePrice,
            hasConfirmedDiscount: promptInputs.hasConfirmedDiscount,
            benefits: realBenefitTexts,
          }),
        ),
      ]);

      const cleanUrl = saveFinalRender(selection.merchantListingId, "catalog_clean", nextVersion, cleanPng);
      const overlayUrl = saveFinalRender(selection.merchantListingId, "ad_overlay", nextVersion, overlayPng);

      await prisma.$transaction([
        prisma.vitrineCreative.updateMany({
          where: { merchantListingId: selection.merchantListingId },
          data: { publishedAt: null },
        }),
        prisma.vitrineCreative.create({
          data: {
            merchantListingId: selection.merchantListingId,
            kind: "catalog_clean",
            version: nextVersion,
            originalPhotoUrl: product.imageUrl,
            aiBaseImageUrl: aiBaseFileName,
            finalImageUrl: cleanUrl,
            promptInputs,
            promptText,
            model: generation.model,
            costUsd: generation.costUsd,
            qualityStatus: "approved",
            qualityNotes: qc.notes,
            publishedAt: new Date(),
          },
        }),
        prisma.vitrineCreative.create({
          data: {
            merchantListingId: selection.merchantListingId,
            kind: "ad_overlay",
            version: nextVersion,
            originalPhotoUrl: product.imageUrl,
            aiBaseImageUrl: aiBaseFileName,
            finalImageUrl: overlayUrl,
            promptInputs,
            promptText,
            model: generation.model,
            costUsd: 0, // the real cost was already attributed to the catalog_clean row above — never double-count the same generation call
            qualityStatus: "approved",
            qualityNotes: qc.notes,
            publishedAt: new Date(),
          },
        }),
      ]);

      generated += 1;
      ctx.counters.created += 1;
    }

    ctx.counters.processed = active.length;
    ctx.metadata.generated = generated;
    ctx.metadata.priceOnlyUpdates = priceOnlyUpdates;
    ctx.metadata.skipped = skipped;
    ctx.metadata.rejected = rejected;
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runVitrineCreativeFactoryJob()
    .then((counters) => console.log("VITRINE_CREATIVE_FACTORY done:", JSON.stringify(counters)))
    .catch((err) => {
      console.error("VITRINE_CREATIVE_FACTORY failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
