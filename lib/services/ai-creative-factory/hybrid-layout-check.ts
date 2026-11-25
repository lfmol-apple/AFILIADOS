import { computeHybridLayout, type HybridLayout, type HybridLayoutRect } from "@/lib/services/ai-creative-factory/compositor";
import { checkReservedBottomZone, type MarginSafetyViolation } from "@/lib/services/ai-creative-factory/margin-safety-check";

/**
 * Geometric validation for the hybrid mechanism — owner's directive,
 * 2026-11-25 ("não quero aumentar arbitrariamente o limite de densidade
 * de bordas... implemente a validação geométrica... quero uma
 * verificação objetiva das coordenadas e dos limites dos elementos
 * desenhados").
 *
 * Why this is a SEPARATE check from margin-safety-check.ts's pixel edge-
 * density gate, not a replacement for it: that gate was built and
 * calibrated for the ONE-SHOT mechanism, where the AI chooses every
 * pixel and the only honest way to catch a cut is to look at the actual
 * decoded image. The hybrid mechanism is the opposite case — every
 * element's position is a real number this codebase computed itself
 * (see compositor.tsx's computeHybridLayout), so the authoritative check
 * is comparing those real coordinates against the canvas and against
 * each other, not re-deriving an approximate signal from pixels. Both
 * checks stay in place, each for the mechanism it actually fits:
 * one_shot keeps the calibrated pixel gate untouched; hybrid gets this
 * one instead (never both, and never a relaxed pixel threshold just to
 * make hybrid pass a check built for a different failure mode).
 */

export interface LayoutViolation {
  check: string;
  detail: string;
}

export interface LayoutCheckResult {
  safe: boolean;
  violations: LayoutViolation[];
  layout: HybridLayout;
}

function withinCanvas(rect: HybridLayoutRect, canvasWidth: number, canvasHeight: number): string | null {
  if (rect.left < 0) return `left edge (${rect.left}) is negative`;
  if (rect.top < 0) return `top edge (${rect.top}) is negative`;
  if (rect.left + rect.width > canvasWidth) return `right edge (${rect.left + rect.width}) exceeds canvas width (${canvasWidth})`;
  if (rect.top + rect.height > canvasHeight) return `bottom edge (${rect.top + rect.height}) exceeds canvas height (${canvasHeight})`;
  return null;
}

/** Minimum side margin this project treats as a real safety margin, not
 * just "technically not negative" — same spirit as the one-shot
 * mechanism's own top/bottom margins, applied here to left/right. */
const MIN_SIDE_MARGIN_PX = 24;

export function checkHybridLayoutGeometry(input: {
  title: string;
  currentPrice: number;
  referencePrice: number | null;
  hasConfirmedDiscount: boolean;
  benefits: string[];
  canvasWidth: number;
  canvasHeight: number;
}): LayoutCheckResult {
  const layout = computeHybridLayout(input);
  const violations: LayoutViolation[] = [];

  // 1. Dimensões finais da imagem.
  if (layout.canvasWidth !== input.canvasWidth || layout.canvasHeight !== input.canvasHeight) {
    violations.push({ check: "final_dimensions", detail: "layout canvas size does not match the requested final dimensions" });
  }

  // 2. Limites reais do título + margens superiores e laterais.
  const titleOverflow = withinCanvas(layout.title, layout.canvasWidth, layout.canvasHeight);
  if (titleOverflow) violations.push({ check: "title_bounds", detail: titleOverflow });
  if (layout.title.left < MIN_SIDE_MARGIN_PX) {
    violations.push({ check: "title_left_margin", detail: `left margin (${layout.title.left}px) below minimum (${MIN_SIDE_MARGIN_PX}px)` });
  }
  const titleRightMargin = layout.canvasWidth - (layout.title.left + layout.title.width);
  if (titleRightMargin < MIN_SIDE_MARGIN_PX) {
    violations.push({ check: "title_right_margin", detail: `right margin (${titleRightMargin}px) below minimum (${MIN_SIDE_MARGIN_PX}px)` });
  }
  if (layout.title.top < MIN_SIDE_MARGIN_PX) {
    violations.push({ check: "title_top_margin", detail: `top margin (${layout.title.top}px) below minimum (${MIN_SIDE_MARGIN_PX}px)` });
  }

  // 3. Área ocupada pelos ícones / benefícios — dentro dos limites e sem
  // sobrepor o título acima nem o preço abaixo.
  if (layout.benefits) {
    const benefitsOverflow = withinCanvas(layout.benefits, layout.canvasWidth, layout.canvasHeight);
    if (benefitsOverflow) violations.push({ check: "benefits_bounds", detail: benefitsOverflow });
    const titleBottom = layout.title.top + layout.title.height;
    if (layout.benefits.top < titleBottom) {
      violations.push({
        check: "title_benefits_overlap",
        detail: `benefits top (${layout.benefits.top}) is above title bottom (${titleBottom})`,
      });
    }
    const benefitsBottom = layout.benefits.top + layout.benefits.height;
    if (benefitsBottom > layout.price.top) {
      violations.push({
        check: "benefits_price_overlap",
        detail: `benefits bottom (${benefitsBottom}) exceeds price badge top (${layout.price.top})`,
      });
    }
  } else {
    const titleBottom = layout.title.top + layout.title.height;
    if (titleBottom > layout.price.top) {
      violations.push({
        check: "title_price_overlap",
        detail: `title bottom (${titleBottom}) exceeds price badge top (${layout.price.top}), with no benefits block between them`,
      });
    }
  }

  // 4. Posição do preço — dentro dos limites, margens laterais reais, e
  // nunca invadindo a faixa reservada do Mercado Livre.
  const priceOverflow = withinCanvas(layout.price, layout.canvasWidth, layout.canvasHeight);
  if (priceOverflow) violations.push({ check: "price_bounds", detail: priceOverflow });
  const priceRightMargin = layout.canvasWidth - (layout.price.left + layout.price.width);
  if (priceRightMargin < MIN_SIDE_MARGIN_PX) {
    violations.push({ check: "price_right_margin", detail: `estimated right margin (${Math.round(priceRightMargin)}px) below minimum (${MIN_SIDE_MARGIN_PX}px)` });
  }
  const priceBottom = layout.price.top + layout.price.height;
  const gapToReservedZone = layout.reservedZone.top - priceBottom;
  if (gapToReservedZone <= 0) {
    violations.push({
      check: "price_reserved_zone_overlap",
      detail: `price badge bottom (${priceBottom}) reaches or exceeds the reserved Mercado Livre band top (${layout.reservedZone.top})`,
    });
  }

  // 5. Faixa inferior do Mercado Livre — ocupa exatamente o fundo do
  // canvas, sem gap nem sobreposição com o conteúdo acima.
  if (layout.reservedZone.top + layout.reservedZone.height !== layout.canvasHeight) {
    violations.push({ check: "reserved_zone_bounds", detail: "reserved zone does not reach the bottom edge of the canvas" });
  }

  // 6. Ausência de sobreposição — títulos cobertos acima; aqui, checagem
  // final de que nenhum retângulo conhecido invade a faixa reservada.
  for (const [name, rect] of [["title", layout.title], ["benefits", layout.benefits], ["price", layout.price]] as const) {
    if (!rect) continue;
    if (rect.top + rect.height > layout.reservedZone.top) {
      violations.push({ check: `${name}_reserved_zone_overlap`, detail: `${name} bottom (${rect.top + rect.height}) overlaps the reserved zone (starts at ${layout.reservedZone.top})` });
    }
  }

  return { safe: violations.length === 0, violations, layout };
}

export interface HybridMarginSafetyResult {
  safe: boolean;
  layoutViolations: LayoutViolation[];
  pixelViolations: MarginSafetyViolation[];
}

/**
 * The combined gate for the HYBRID mechanism specifically — owner's
 * directive, 2026-11-25 ("mantendo a proteção contra cortes nos
 * criativos gerados pelo mecanismo anterior"): the one_shot mechanism
 * keeps using `checkMarginSafety` (margin-safety-check.ts) exactly as
 * calibrated, completely untouched by this file. Hybrid uses this
 * instead:
 *   - `checkHybridLayoutGeometry` is the AUTHORITATIVE check here — the
 *     real computed coordinates, not an approximation, so it replaces
 *     the pixel-based TOP-margin check for this mechanism (that check's
 *     premise — unknown AI-drawn content near a crop edge — doesn't
 *     apply to deterministically-positioned text).
 *   - `checkReservedBottomZone` (same pixel check one_shot uses) is kept
 *     as a second, independent backstop on the actual rendered pixels —
 *     it catches a real rendering-engine mismatch (Satori drawing
 *     something other than what the layout math predicted), which the
 *     geometry check alone cannot see since it never decodes a pixel.
 * Investigated 2026-11-25: a real hybrid pilot (Secador Philco) failed
 * only the TOP pixel check (0.02846 vs 0.028), never the bottom one.
 * Splitting the zone into the known title bbox vs. everything else
 * showed 0 edge density outside the title's own verified-safe bounding
 * box, and 0.064 inside it — the entire reading is the title's own
 * legible text, not stray content near an edge. The calibration set
 * (15 images) was built entirely from AI-drawn text, which renders
 * softer per pixel than this mechanism's crisp, code-drawn glyphs — so
 * a mechanism-specific false positive here was expected, not a sign the
 * global threshold needs loosening (it still fully applies to one_shot).
 */
export function checkHybridMarginSafety(input: {
  title: string;
  currentPrice: number;
  referencePrice: number | null;
  hasConfirmedDiscount: boolean;
  benefits: string[];
  canvasWidth: number;
  canvasHeight: number;
  preBarImageBuffer: Buffer;
  ctaBarHeightFraction: number;
}): HybridMarginSafetyResult {
  const geometry = checkHybridLayoutGeometry(input);
  const bottomPixelCheck = checkReservedBottomZone(input.preBarImageBuffer, input.ctaBarHeightFraction);
  return {
    safe: geometry.safe && bottomPixelCheck.safe,
    layoutViolations: geometry.violations,
    pixelViolations: bottomPixelCheck.violations,
  };
}
