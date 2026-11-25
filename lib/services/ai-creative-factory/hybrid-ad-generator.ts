import {
  generateBackgroundOnly,
  HYBRID_MECHANISM_TAG,
  type OneShotAdInput,
} from "@/lib/services/ai-creative-factory/one-shot-ad-generator";
import {
  renderCatalogClean,
  renderHybridTextOverlay,
  compositeDeterministicCtaBar,
  toBuffer,
  CREATIVE_FINAL_DIMENSIONS,
  CTA_BAR_HEIGHT_FRACTION,
  CtaBarAssetMissingError,
} from "@/lib/services/ai-creative-factory/compositor";
import { checkHybridMarginSafety, type HybridMarginSafetyResult } from "@/lib/services/ai-creative-factory/hybrid-layout-check";

/**
 * End-to-end hybrid `ad_overlay` generation — owner's directive,
 * 2026-11-25 ("prepare a composição híbrida como mecanismo preferencial
 * para novos produtos, condicionada à minha aprovação visual"). Mirrors
 * the real pipeline piloted on Secador Philco this same day (background-
 * only paid call → deterministic crop → deterministic text/price/icon
 * overlay → deterministic CTA bar), packaged as one function so
 * jobs/vitrine-creative-factory.ts can call it exactly like a single
 * `generateOneShotAd` call for a brand-new product.
 *
 * Deliberately NEVER called for a product that already has an
 * `ad_overlay` row — jobs/vitrine-creative-factory.ts only reaches this
 * function from the `!hasExistingRow` branch, gated by
 * `env.VITRINE_NEW_PRODUCT_MECHANISM`, so flipping that config can never
 * by itself cause an existing, approved creative to regenerate (see
 * `shouldRegenerateAdOverlay`'s mechanism check, which already accepts
 * HYBRID_MECHANISM_TAG as a valid, non-mismatched tag either way).
 */
export interface HybridAdOverlayResult {
  /** The AI's background-only output — same slot `aiBaseImageUrl`
   * already stores for one-shot rows. */
  aiImageBuffer: Buffer;
  /** Final, published-ready bytes: cropped, text/price/icons drawn,
   * Mercado Livre bar composited — exactly what runQualityControl and
   * the XML feed should see. */
  finalImageBuffer: Buffer;
  model: string;
  costUsd: number;
  promptText: string;
  mechanism: typeof HYBRID_MECHANISM_TAG;
  /** What price the deterministic overlay actually baked into the
   * pixels — same role `OneShotAdResult.bakedCurrentPrice`/
   * `bakedReferencePrice` play for the one-shot mechanism's own
   * `isBakedPriceStale` check. Unlike one-shot (where the AI interprets
   * the instruction), this is simply the input echoed back — the
   * renderer never reinterprets it — except `bakedReferencePrice`,
   * which mirrors `renderHybridTextOverlay`'s own `hasRealDrop` gate:
   * null whenever the crossed-out price wasn't actually drawn. */
  bakedCurrentPrice: number;
  bakedReferencePrice: number | null;
  /** Geometry + bottom-reserved-zone pixel check — the hybrid
   * mechanism's OWN gate, never the one_shot pixel top-margin gate (see
   * hybrid-layout-check.ts's own doc comment for why they differ). */
  marginCheck: HybridMarginSafetyResult;
}

export async function generateHybridAdOverlay(input: OneShotAdInput): Promise<HybridAdOverlayResult> {
  const background = await generateBackgroundOnly({
    externalId: input.externalId,
    title: input.title,
    brand: input.brand,
    productPhoto: input.productPhoto,
    productPhotoContentType: input.productPhotoContentType,
    backgroundStyle: input.backgroundStyle,
    colorPalette: input.colorPalette,
    ambientation: input.ambientation,
  });

  const croppedBase = await toBuffer(
    renderCatalogClean({ aiBaseImageDataUri: `data:image/png;base64,${background.imageBuffer.toString("base64")}` }),
  );

  const hasConfirmedDiscount = input.hasConfirmedDiscount;
  const textOverlay = renderHybridTextOverlay({
    baseImageDataUri: `data:image/png;base64,${croppedBase.toString("base64")}`,
    title: input.title,
    currentPrice: input.currentPrice,
    referencePrice: input.referencePrice,
    hasConfirmedDiscount,
    benefits: input.benefits ?? [],
  });
  const preBarImage = await toBuffer(textOverlay);

  // compositeDeterministicCtaBar throws CtaBarAssetMissingError if the
  // real asset is missing — deliberately NOT caught here, same as the
  // one-shot pipeline: the caller (the job) decides what "never publish
  // an incomplete result" looks like for its own counters/logging.
  const finalImageBuffer = await compositeDeterministicCtaBar({
    baseImageDataUri: `data:image/png;base64,${preBarImage.toString("base64")}`,
    width: CREATIVE_FINAL_DIMENSIONS.width,
    height: CREATIVE_FINAL_DIMENSIONS.height,
  });

  const marginCheck = checkHybridMarginSafety({
    title: input.title,
    currentPrice: input.currentPrice,
    referencePrice: input.referencePrice,
    hasConfirmedDiscount,
    benefits: input.benefits ?? [],
    canvasWidth: CREATIVE_FINAL_DIMENSIONS.width,
    canvasHeight: CREATIVE_FINAL_DIMENSIONS.height,
    preBarImageBuffer: preBarImage,
    ctaBarHeightFraction: CTA_BAR_HEIGHT_FRACTION,
  });

  const hasRealDrop = hasConfirmedDiscount && input.referencePrice !== null && input.referencePrice > input.currentPrice;

  return {
    aiImageBuffer: background.imageBuffer,
    finalImageBuffer,
    model: background.model,
    costUsd: background.costUsd,
    promptText: background.promptText,
    mechanism: HYBRID_MECHANISM_TAG,
    bakedCurrentPrice: input.currentPrice,
    bakedReferencePrice: hasRealDrop ? input.referencePrice : null,
    marginCheck,
  };
}

export { CtaBarAssetMissingError };
