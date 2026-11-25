import { decodePng, type DecodedPng } from "@/lib/services/ai-creative-factory/png-decode";

/**
 * Deterministic, pixel-level cut-safety gate — owner's directive,
 * 2026-11-24 ("não quero depender exclusivamente de sucessivas
 * alterações no prompt... avalie uma área de segurança que impeça
 * tecnicamente o corte"). This is NOT a replacement for the prompt's
 * crop-safety margins or for the vision-based quality check — it is a
 * third, independent, un-bypassable layer: pure arithmetic on the real
 * decoded pixels, with no AI judgment involved, so it can never be
 * talked out of a verdict the way a vision model occasionally can be.
 *
 * Why this exists: even with the reconciled prompt (top/bottom margins
 * + "don't draw the Mercado Livre bar"), a real validation run the same
 * day still produced a violation — the Secador Philco generation drew
 * its price badge low enough to be partially covered by the
 * deterministic CTA bar, on the FIRST attempt AND on a retry. A model
 * that works 8 times out of 10 is not a safe gate by itself for "gerar
 * centenas de criativos sem exigir correções manuais constantes" — this
 * check is the backstop that catches the other 2.
 *
 * Method: an image model's drawn text/icons/badges have sharp, high-
 * contrast edges (typography, logos, hard-edged UI shapes); a photo
 * background — even a busy, textured one — has much softer local
 * gradients by comparison. Counting the fraction of strong edges
 * (luminance delta between adjacent pixels above a threshold) inside
 * each margin zone separates the two cleanly in practice.
 *
 * Calibrated, 2026-11-24, against 15 real images from this exact
 * session (never synthetic numbers): 8 clean post-reconciliation
 * generations (Pistola Tssaper, Kärcher, Bicicleta Spinning X11, Moto
 * G17, Whey Max Titanium, Lavadora Electrolux, Electrolux Kit 3 Bowls,
 * Kit Halteres Barra E Anilhas) vs. 7 real defective ones (the same 6
 * products' PRE-reconciliation published versions, title touching/cut
 * at the top, plus both Secador Philco attempts with the price badge
 * invading the bottom reserved band):
 *   top margin edge density    — clean: 0.0021–0.0253, defective: 0.0338–0.0482
 *   bottom reserved-zone density — clean: 0.0000–0.0083, defective: 0.0105–0.0274
 * Both have a real, comfortable gap between the clean and defective
 * clusters — the thresholds below sit in the middle of each gap, not at
 * either edge.
 */

const STRONG_EDGE_LUMINANCE_DELTA = 30;
/** Max fraction of strong-edge pixels tolerated in the top margin band
 * before this is flagged as "something is drawn too close to the top
 * edge" — see calibration note above (clean max 0.0253, defective min
 * 0.0338). */
export const TOP_MARGIN_MAX_EDGE_DENSITY = 0.028;
/** Max fraction of strong-edge pixels tolerated in the bottom RESERVED
 * band (where the deterministic CTA bar will be pasted), checked on the
 * image BEFORE that bar is composited — see calibration note above
 * (clean max 0.0083, defective min 0.0105). */
export const RESERVED_ZONE_MAX_EDGE_DENSITY = 0.009;

function luminance(pixels: Buffer, idx: number, channels: number): number {
  // Standard perceptual luminance weights — good enough for edge
  // detection, not meant to be colorimetrically exact.
  return 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
  void channels;
}

/** Fraction of adjacent-pixel luminance deltas (horizontal + vertical)
 * inside [y0, y1) that exceed STRONG_EDGE_LUMINANCE_DELTA — pure
 * arithmetic over decoded pixels, no AI call, deterministic every time
 * for the same bytes. */
function edgeDensity(png: DecodedPng, y0: number, y1: number): number {
  const { width, channels, pixels } = png;
  let strong = 0;
  let total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * channels;
      const here = luminance(pixels, idx, channels);
      if (x + 1 < width) {
        const right = luminance(pixels, idx + channels, channels);
        if (Math.abs(here - right) > STRONG_EDGE_LUMINANCE_DELTA) strong++;
        total++;
      }
      if (y + 1 < y1 && y + 1 < png.height) {
        const below = luminance(pixels, idx + width * channels, channels);
        if (Math.abs(here - below) > STRONG_EDGE_LUMINANCE_DELTA) strong++;
        total++;
      }
    }
  }
  return total === 0 ? 0 : strong / total;
}

export interface MarginSafetyViolation {
  zone: "top" | "bottom_reserved";
  edgeDensity: number;
  threshold: number;
}

export interface MarginSafetyResult {
  safe: boolean;
  violations: MarginSafetyViolation[];
}

/** Checks the TOP margin of a FINAL (post-crop) image — call this on
 * whatever `renderCatalogClean` produces, before or after the CTA bar is
 * composited (the top margin is unaffected by that step either way). */
export function checkTopMargin(finalImageBuffer: Buffer, topMarginPercent: number): MarginSafetyResult {
  const png = decodePng(finalImageBuffer);
  const topH = Math.round((png.height * topMarginPercent) / 100);
  const density = edgeDensity(png, 0, topH);
  const safe = density <= TOP_MARGIN_MAX_EDGE_DENSITY;
  return {
    safe,
    violations: safe ? [] : [{ zone: "top", edgeDensity: density, threshold: TOP_MARGIN_MAX_EDGE_DENSITY }],
  };
}

/** Checks the bottom RESERVED band (where the deterministic CTA bar
 * will go) — call this on the CROPPED image BEFORE compositing the bar,
 * never after: the bar's own real content (wordmark, button text) would
 * otherwise dominate the signal and hide a real violation underneath
 * it, exactly the failure mode this check exists to catch. */
export function checkReservedBottomZone(preBarImageBuffer: Buffer, ctaBarHeightFraction: number): MarginSafetyResult {
  const png = decodePng(preBarImageBuffer);
  const reservedStart = Math.round(png.height * (1 - ctaBarHeightFraction));
  const density = edgeDensity(png, reservedStart, png.height);
  const safe = density <= RESERVED_ZONE_MAX_EDGE_DENSITY;
  return {
    safe,
    violations: safe ? [] : [{ zone: "bottom_reserved", edgeDensity: density, threshold: RESERVED_ZONE_MAX_EDGE_DENSITY }],
  };
}

/** Convenience combined check — top on the final image, bottom-reserved
 * on the pre-bar image (see each function's own doc for why they look at
 * different stages of the pipeline). */
export function checkMarginSafety(input: {
  preBarImageBuffer: Buffer;
  finalImageBuffer: Buffer;
  topMarginPercent: number;
  ctaBarHeightFraction: number;
}): MarginSafetyResult {
  const top = checkTopMargin(input.finalImageBuffer, input.topMarginPercent);
  const bottom = checkReservedBottomZone(input.preBarImageBuffer, input.ctaBarHeightFraction);
  return { safe: top.safe && bottom.safe, violations: [...top.violations, ...bottom.violations] };
}
