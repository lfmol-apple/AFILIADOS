import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { loadPublicMerchantProduct } from "@/lib/queries/public-product";
import { checkCreativeBudget, recordCreativeSpend } from "@/lib/services/ai-creative-factory/budget";
import { buildCreativePrompt } from "@/lib/services/ai-creative-factory/prompt-builder";
import { generateCreativeBase, OpenAiImageNotConfiguredError } from "@/lib/services/ai-creative-factory/openai-image-client";
import {
  generateOneShotAd,
  isBakedPriceStale,
  shouldRegenerateAdOverlay,
  shouldAttemptPriceRegenerationNow,
  OneShotReferenceMissingError,
  OneShotMigrationNotAuthorizedError,
  ONE_SHOT_MECHANISM_TAG,
} from "@/lib/services/ai-creative-factory/one-shot-ad-generator";
import { runQualityControl } from "@/lib/services/ai-creative-factory/quality-control";
import { renderCatalogClean, toBuffer } from "@/lib/services/ai-creative-factory/compositor";
import type { ImpulseFitHypothesis } from "@/lib/services/commercial-intelligence/ad-potential-hypothesis";
import { saveAiBase, saveFinalRender } from "@/lib/services/ai-creative-factory/creative-image-store";
import { interpretProduct } from "@/lib/services/ai-creative-factory/product-interpretation";

/**
 * Fábrica Inteligente de Criativos — orchestration job.
 *
 * Owner's directive, 2026-11-21 ("o pilot-result-3 é nossa referência
 * oficial... integre esse mecanismo à fábrica principal"): `ad_overlay`
 * and `catalog_clean` are now two FULLY INDEPENDENT generation paths —
 * they no longer share one AI base image, because they have genuinely
 * different jobs and different rules:
 *
 *  - `catalog_clean`: the Meta catalog feed's image (app/catalogo/
 *    mercado-livre.xml/route.ts) — MUST stay free of baked-in price/
 *    text (confirmed against Meta's own docs, see that route's comment).
 *    Unchanged mechanism: AI draws scenario/ambientation only
 *    (prompt-builder.ts), zero style reference.
 *  - `ad_overlay`: the full commercial creative — owner-approved
 *    standard is the ONE-SHOT mechanism proven across 3 real pilots
 *    (scripts/pilot-henrique-style.ts, see one-shot-ad-generator.ts),
 *    never the old "AI scenario + compositor.tsx overlay" hybrid. That
 *    hybrid produced a result the owner directly rejected — this file
 *    does NOT import compositor.tsx's `renderAdOverlay` at all anymore,
 *    so it is structurally impossible for this job to fall back to it.
 *
 * Regeneration policy per kind:
 *  - catalog_clean: unchanged — regenerates on no-row / rejected /
 *    category-or-event change. Never needs a price-only path (it never
 *    carries price).
 *  - ad_overlay: regenerates on no-row / rejected / category-or-event
 *    change / mechanism mismatch (an existing row from the OLD hybrid
 *    mechanism always counts as needing regeneration — see
 *    `ONE_SHOT_MECHANISM_TAG`) / baked price gone stale
 *    (`isBakedPriceStale`). There is NO zero-cost "price-only" shortcut
 *    for ad_overlay anymore: the price is baked into the pixels by the
 *    one-shot call, so a price change can only be fixed by a real
 *    regeneration. If budget is unavailable or the one-shot mechanism
 *    itself fails (e.g. OneShotReferenceMissingError), the job NEVER
 *    republishes a stale-priced ad_overlay — it unpublishes the existing
 *    one instead (owner's explicit rule, 2026-11-21: "não permita
 *    publicar uma arte com preço desatualizado").
 */
interface AdOverlayPromptInputs {
  mechanism: typeof ONE_SHOT_MECHANISM_TAG;
  bakedCurrentPrice: number;
  bakedReferencePrice: number | null;
  categoryHint: string | null;
  isSeasonalEvent: string | null;
  // Prisma's Json input type requires an index signature, not just named fields.
  [key: string]: unknown;
}

export async function runVitrineCreativeFactoryJob() {
  return runJob("VITRINE_CREATIVE_FACTORY", async (ctx) => {
    const active = await prisma.vitrineSelection.findMany({
      where: { status: "ACTIVE" },
      select: {
        merchantListingId: true,
        scoreBreakdown: true,
        merchantListing: {
          select: {
            externalId: true,
            canonicalProduct: { select: { publicSlug: true, title: true, brand: true, categoryId: true } },
          },
        },
      },
    });

    const counters = {
      catalogGenerated: 0,
      catalogSkipped: 0,
      catalogRejected: 0,
      adGenerated: 0,
      adSkipped: 0,
      adRejected: 0,
      adUnpublishedStale: 0,
      adBlockedNoReference: 0,
      adBlockedMigrationNotAuthorized: 0,
      adPriceRegenerationDebounced: 0,
    };

    for (const selection of active) {
      const slug = selection.merchantListing.canonicalProduct?.publicSlug;
      if (!slug) {
        counters.catalogSkipped += 1;
        counters.adSkipped += 1;
        continue;
      }
      const product = await loadPublicMerchantProduct(slug).catch(() => null);
      if (!product || !product.imageUrl || product.currentPrice === null) {
        counters.catalogSkipped += 1;
        counters.adSkipped += 1;
        continue;
      }

      const breakdown = selection.scoreBreakdown as {
        matchedEventName?: string | null;
        adPotentialHypothesis?: { impulseFit?: string };
      } | null;
      const categoryHint = selection.merchantListing.canonicalProduct?.categoryId ?? null;
      const eventName = breakdown?.matchedEventName ?? null;
      const hasConfirmedDiscount = product.discountPercent !== null && product.discountPercent > 0;

      // Real, traceable benefits — shared by both paths, zero cost.
      const creativeProfile = interpretProduct({
        title: product.title,
        brand: product.brand,
        categoryHint,
        currentPrice: product.currentPrice,
        referencePrice: product.referencePrice,
        hasConfirmedDiscount,
        rating: product.rating,
        reviewCount: product.reviewCount,
        isSeasonalEvent: eventName,
      });
      const realBenefitTexts = creativeProfile.benefits.map((b) => b.text);

      // ==================== catalog_clean (unchanged mechanism) ====================
      const latestCatalogClean = await prisma.vitrineCreative.findFirst({
        where: { merchantListingId: selection.merchantListingId, kind: "catalog_clean" },
        orderBy: { version: "desc" },
      });
      const catalogPromptInputsPrev = latestCatalogClean?.promptInputs as Record<string, unknown> | undefined;
      const catalogCategoryChanged = catalogPromptInputsPrev && catalogPromptInputsPrev.categoryHint !== categoryHint;
      const catalogEventChanged = catalogPromptInputsPrev && catalogPromptInputsPrev.isSeasonalEvent !== eventName;
      const catalogNeedsFullGeneration =
        !latestCatalogClean || latestCatalogClean.qualityStatus === "rejected" || catalogCategoryChanged || catalogEventChanged;

      if (catalogNeedsFullGeneration) {
        const budget = await checkCreativeBudget();
        if (!budget.allowed) {
          logger.warn("vitrine_creative_factory.budget_exceeded", { stage: "catalog_clean", reason: budget.reason, merchantListingId: selection.merchantListingId });
          ctx.metadata.budgetStoppedEarly = budget.reason;
          break;
        }

        const photoResponse = await fetch(product.imageUrl).catch(() => null);
        if (!photoResponse || !photoResponse.ok) {
          counters.catalogSkipped += 1;
        } else {
          const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
          const photoContentType = photoResponse.headers.get("content-type") ?? "image/jpeg";

          const promptInputs = {
            title: product.title,
            brand: product.brand,
            categoryHint,
            currentPrice: product.currentPrice,
            referencePrice: product.referencePrice,
            hasConfirmedDiscount,
            rating: product.rating,
            soldQuantityLabel: null,
            impulseFit: (breakdown?.adPotentialHypothesis?.impulseFit ?? "indeterminado") as ImpulseFitHypothesis,
            isSeasonalEvent: eventName,
            benefits: realBenefitTexts,
          };
          const promptText = buildCreativePrompt(promptInputs);

          let generation;
          try {
            generation = await generateCreativeBase({ productPhoto: photoBuffer, productPhotoContentType: photoContentType, prompt: promptText });
          } catch (err) {
            if (err instanceof OpenAiImageNotConfiguredError) {
              ctx.metadata.stoppedReason = "openai_not_configured";
              break;
            }
            logger.error("vitrine_creative_factory.catalog_clean_generation_failed", { merchantListingId: selection.merchantListingId, message: String(err) });
            ctx.counters.errors += 1;
            counters.catalogSkipped += 1;
            generation = undefined;
          }

          if (generation) {
            await recordCreativeSpend({ amountUsd: generation.costUsd, note: `Geração de criativo (catalog_clean) — ${product.title.slice(0, 60)}` });

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

            const nextVersion = (latestCatalogClean?.version ?? 0) + 1;
            const aiBaseFileName = saveAiBase(selection.merchantListingId, nextVersion, generation.imageBuffer);
            const aiBaseDataUri = `data:image/png;base64,${generation.imageBuffer.toString("base64")}`;

            if (qc.status !== "approved") {
              await prisma.vitrineCreative.create({
                data: {
                  merchantListingId: selection.merchantListingId,
                  kind: "catalog_clean",
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
              counters.catalogRejected += 1;
              ctx.counters.errors += 1;
            } else {
              const cleanPng = await toBuffer(renderCatalogClean({ aiBaseImageDataUri: aiBaseDataUri }));
              const cleanUrl = saveFinalRender(selection.merchantListingId, "catalog_clean", nextVersion, cleanPng);
              await prisma.$transaction([
                prisma.vitrineCreative.updateMany({
                  where: { merchantListingId: selection.merchantListingId, kind: "catalog_clean" },
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
              ]);
              counters.catalogGenerated += 1;
              ctx.counters.created += 1;
            }
          }
        }
      } else {
        counters.catalogSkipped += 1;
      }

      // ==================== ad_overlay (one-shot mechanism, owner-approved) ====================
      const latestAdOverlay = await prisma.vitrineCreative.findFirst({
        where: { merchantListingId: selection.merchantListingId, kind: "ad_overlay" },
        orderBy: { version: "desc" },
      });
      const adPromptInputsPrev = latestAdOverlay?.promptInputs as Partial<AdOverlayPromptInputs> | undefined;
      const adMechanismMismatch = !!latestAdOverlay && adPromptInputsPrev?.mechanism !== ONE_SHOT_MECHANISM_TAG;
      const adCategoryChanged = !!adPromptInputsPrev && adPromptInputsPrev.categoryHint !== categoryHint;
      const adEventChanged = !!adPromptInputsPrev && adPromptInputsPrev.isSeasonalEvent !== eventName;
      const adPriceStale =
        !!latestAdOverlay && !adMechanismMismatch && typeof adPromptInputsPrev?.bakedCurrentPrice === "number"
          ? isBakedPriceStale({
              bakedCurrentPrice: adPromptInputsPrev.bakedCurrentPrice,
              bakedReferencePrice: adPromptInputsPrev.bakedReferencePrice ?? null,
              liveCurrentPrice: product.currentPrice,
              liveReferencePrice: product.referencePrice,
            })
          : false;
      const adNeedsFullGeneration = shouldRegenerateAdOverlay({
        hasExistingRow: !!latestAdOverlay,
        existingQualityStatus: (latestAdOverlay?.qualityStatus as "approved" | "rejected" | "pending" | null) ?? null,
        existingMechanism: (adPromptInputsPrev?.mechanism as string | undefined) ?? null,
        categoryChanged: adCategoryChanged,
        eventChanged: adEventChanged,
        priceStale: adPriceStale,
      });

      if (!adNeedsFullGeneration) {
        counters.adSkipped += 1;
        continue;
      }

      // Owner's directive, 2026-11-21 ("não regenere automaticamente uma
      // imagem a cada pequena alteração de preço"): a price-only trigger
      // (nothing else — not a migration, not a rejection, not a category/
      // event change) is debounced. Safety is NEVER debounced: the
      // wrong-priced image comes down immediately regardless; only the
      // real paid attempt to replace it waits for the product's price to
      // settle for a bit.
      const priceStaleOnly = adPriceStale && !adMechanismMismatch && !adCategoryChanged && !adEventChanged && latestAdOverlay?.qualityStatus !== "rejected";
      if (priceStaleOnly && latestAdOverlay) {
        const canAttemptNow = shouldAttemptPriceRegenerationNow({
          lastAttemptAt: latestAdOverlay.generatedAt,
          now: new Date(),
          minIntervalHours: env.VITRINE_PRICE_REGENERATION_MIN_INTERVAL_HOURS,
        });
        if (!canAttemptNow) {
          // Safety is never debounced, only the paid attempt is: the
          // wrong-priced image still comes down this cycle, we just
          // don't spend money trying to replace it again so soon.
          await prisma.vitrineCreative.updateMany({ where: { id: latestAdOverlay.id }, data: { publishedAt: null } });
          counters.adUnpublishedStale += 1;
          counters.adPriceRegenerationDebounced += 1;
          continue;
        }
      }

      const budget = await checkCreativeBudget();
      if (!budget.allowed) {
        logger.warn("vitrine_creative_factory.budget_exceeded", { stage: "ad_overlay", reason: budget.reason, merchantListingId: selection.merchantListingId });
        if (adPriceStale && latestAdOverlay) {
          await prisma.vitrineCreative.updateMany({ where: { id: latestAdOverlay.id }, data: { publishedAt: null } });
          counters.adUnpublishedStale += 1;
        }
        ctx.metadata.budgetStoppedEarly = budget.reason;
        break;
      }

      const photoResponse = await fetch(product.imageUrl).catch(() => null);
      if (!photoResponse || !photoResponse.ok) {
        counters.adSkipped += 1;
        continue;
      }
      const photoBuffer = Buffer.from(await photoResponse.arrayBuffer());
      const photoContentType = photoResponse.headers.get("content-type") ?? "image/jpeg";

      let oneShot;
      try {
        oneShot = await generateOneShotAd({
          externalId: selection.merchantListing.externalId,
          title: product.title,
          brand: product.brand,
          productPhoto: photoBuffer,
          productPhotoContentType: photoContentType,
          currentPrice: product.currentPrice,
          referencePrice: product.referencePrice,
          hasConfirmedDiscount,
          benefits: realBenefitTexts,
          backgroundStyle: creativeProfile.backgroundStyle,
          colorPalette: creativeProfile.colorPalette,
          ambientation: creativeProfile.ambientation,
        });
      } catch (err) {
        if (err instanceof OneShotMigrationNotAuthorizedError) {
          // Owner's directive, 2026-11-21 ("migração progressiva,
          // começando com um único produto autorizado"): this is an
          // EXPECTED, deliberate block, not a failure — never counted as
          // an error, and the existing (still correct, just not-yet-
          // migrated) creative is left exactly as it was.
          logger.info("vitrine_creative_factory.one_shot_migration_not_authorized", { merchantListingId: selection.merchantListingId, message: String(err) });
          counters.adBlockedMigrationNotAuthorized += 1;
          // Price correctness is never optional, though — if THIS specific
          // product's price is genuinely stale, it still comes down even
          // though we're not authorized to regenerate it yet.
          if (adPriceStale && latestAdOverlay) {
            await prisma.vitrineCreative.updateMany({ where: { id: latestAdOverlay.id }, data: { publishedAt: null } });
            counters.adUnpublishedStale += 1;
          }
          continue;
        }
        if (err instanceof OneShotReferenceMissingError) {
          logger.error("vitrine_creative_factory.one_shot_reference_missing", { merchantListingId: selection.merchantListingId, message: String(err) });
          counters.adBlockedNoReference += 1;
        } else if (err instanceof OpenAiImageNotConfiguredError) {
          ctx.metadata.stoppedReason = "openai_not_configured";
          break;
        } else {
          logger.error("vitrine_creative_factory.one_shot_generation_failed", { merchantListingId: selection.merchantListingId, message: String(err) });
        }
        ctx.counters.errors += 1;
        // Never republish a stale-priced ad_overlay just because the
        // replacement failed — fail safe, not silently stale.
        if (adPriceStale && latestAdOverlay) {
          await prisma.vitrineCreative.updateMany({ where: { id: latestAdOverlay.id }, data: { publishedAt: null } });
          counters.adUnpublishedStale += 1;
        }
        continue;
      }

      await recordCreativeSpend({ amountUsd: oneShot.costUsd, note: `Geração one-shot (ad_overlay, padrão aprovado) — ${product.title.slice(0, 60)}` });

      const qc = await runQualityControl({
        generatedImageBuffer: oneShot.imageBuffer,
        expectedWidth: 1024,
        expectedHeight: 1536,
        originalPhotoBase64: photoBuffer.toString("base64"),
        title: product.title,
      });
      if (qc.visionCheckCostUsd) {
        await recordCreativeSpend({ amountUsd: qc.visionCheckCostUsd, note: "Checagem visual de qualidade" });
      }

      const nextAdVersion = (latestAdOverlay?.version ?? 0) + 1;
      const aiBaseFileName = saveAiBase(selection.merchantListingId, nextAdVersion, oneShot.imageBuffer);
      const promptInputs = {
        mechanism: ONE_SHOT_MECHANISM_TAG,
        bakedCurrentPrice: oneShot.bakedCurrentPrice,
        bakedReferencePrice: oneShot.bakedReferencePrice,
        categoryHint,
        isSeasonalEvent: eventName,
      } satisfies AdOverlayPromptInputs;

      if (qc.status !== "approved") {
        await prisma.vitrineCreative.create({
          data: {
            merchantListingId: selection.merchantListingId,
            kind: "ad_overlay",
            version: nextAdVersion,
            originalPhotoUrl: product.imageUrl,
            aiBaseImageUrl: aiBaseFileName,
            finalImageUrl: product.imageUrl,
            promptInputs,
            promptText: oneShot.promptText,
            model: oneShot.model,
            costUsd: oneShot.costUsd,
            qualityStatus: qc.status,
            qualityNotes: qc.notes,
            publishedAt: null,
          },
        });
        // Owner's rule, 2026-11-21 ("um erro na geração não substitui uma
        // imagem aprovada por uma imagem defeituosa"): this rejected
        // attempt is correctly never published. But the OTHER direction
        // matters just as much here — if the regeneration was triggered
        // BECAUSE the old image's baked price had gone stale, that old
        // image is now a KNOWN-WRONG price, and a failed replacement must
        // not leave it looking "still published" either.
        if (adPriceStale && latestAdOverlay) {
          await prisma.vitrineCreative.updateMany({ where: { id: latestAdOverlay.id }, data: { publishedAt: null } });
          counters.adUnpublishedStale += 1;
        }
        counters.adRejected += 1;
        ctx.counters.errors += 1;
        continue;
      }

      // The one-shot image already has every commercial element drawn by
      // the AI — the final asset is just the proven 4:5 crop, never a
      // code-composed overlay on top (renderCatalogClean is reused here
      // purely for its crop math, same as pilot-henrique-style.ts did).
      const finalPng = await toBuffer(renderCatalogClean({ aiBaseImageDataUri: `data:image/png;base64,${oneShot.imageBuffer.toString("base64")}` }));
      const finalUrl = saveFinalRender(selection.merchantListingId, "ad_overlay", nextAdVersion, finalPng);

      await prisma.$transaction([
        prisma.vitrineCreative.updateMany({
          where: { merchantListingId: selection.merchantListingId, kind: "ad_overlay" },
          data: { publishedAt: null },
        }),
        prisma.vitrineCreative.create({
          data: {
            merchantListingId: selection.merchantListingId,
            kind: "ad_overlay",
            version: nextAdVersion,
            originalPhotoUrl: product.imageUrl,
            aiBaseImageUrl: aiBaseFileName,
            finalImageUrl: finalUrl,
            promptInputs,
            promptText: oneShot.promptText,
            model: oneShot.model,
            costUsd: oneShot.costUsd,
            qualityStatus: "approved",
            qualityNotes: qc.notes,
            publishedAt: new Date(),
          },
        }),
      ]);
      counters.adGenerated += 1;
      ctx.counters.created += 1;
    }

    ctx.counters.processed = active.length;
    Object.assign(ctx.metadata, counters);
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
