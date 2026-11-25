import { describe, it, expect } from "vitest";
import { checkHybridLayoutGeometry, checkHybridMarginSafety } from "@/lib/services/ai-creative-factory/hybrid-layout-check";
import { renderHybridTextOverlay, toBuffer, CTA_BAR_HEIGHT_FRACTION, CREATIVE_FINAL_DIMENSIONS } from "@/lib/services/ai-creative-factory/compositor";
import { ImageResponse } from "next/og";

/**
 * Owner's directive, 2026-11-25 ("não quero aumentar arbitrariamente o
 * limite de densidade de bordas... quero uma verificação objetiva das
 * coordenadas"): these tests prove the geometric gate catches what the
 * pixel-density gate cannot reason about directly — the real computed
 * bounding boxes of every element the hybrid mechanism draws.
 */
describe("checkHybridLayoutGeometry", () => {
  it("passes for the real Secador Philco hybrid pilot inputs", () => {
    const result = checkHybridLayoutGeometry({
      title: "Secador De Cabelos Philco PSC3500 4 Em 1 Dobrável Motor BLDC",
      currentPrice: 498.9,
      referencePrice: 709.0,
      hasConfirmedDiscount: true,
      benefits: ["4 FUNÇÕES EM 1", "DOBRÁVEL FÁCIL DE GUARDAR"],
      canvasWidth: 1080,
      canvasHeight: 1350,
    });
    expect(result.safe).toBe(true);
    expect(result.violations).toEqual([]);
    // Real margins, not just "not negative".
    expect(result.layout.title.left).toBeGreaterThanOrEqual(24);
    expect(result.layout.canvasWidth - (result.layout.title.left + result.layout.title.width)).toBeGreaterThanOrEqual(24);
    // The structural guarantee this mechanism exists for: a real gap
    // between the price badge and the reserved Mercado Livre band.
    const priceBottom = result.layout.price.top + result.layout.price.height;
    expect(result.layout.reservedZone.top - priceBottom).toBe(40);
  });

  it("flags an overlap when a product has so many long benefits the block would collide with the price badge", () => {
    const result = checkHybridLayoutGeometry({
      title: "Produto",
      currentPrice: 99.9,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [
        "Benefício ".repeat(55),
        "Benefício ".repeat(55),
        "Benefício ".repeat(55),
      ],
      canvasWidth: 1080,
      canvasHeight: 1350,
    });
    // This is a real, previously-unverified gap this check exists to
    // surface: benefits have no fitFontSize shrink-to-fit, so very long
    // strings can push the block's real height past the price badge.
    const overlap = result.violations.some((v) => v.check === "benefits_price_overlap");
    expect(overlap).toBe(true);
    expect(result.safe).toBe(false);
  });

  it("never reports a violation for a product with zero benefits", () => {
    const result = checkHybridLayoutGeometry({
      title: "Fritadeira Elétrica Air Fryer Quad Fry Elgin",
      currentPrice: 179.0,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
      canvasWidth: 1080,
      canvasHeight: 1350,
    });
    expect(result.safe).toBe(true);
    expect(result.layout.benefits).toBeNull();
  });
});

describe("checkHybridMarginSafety — combined gate for the hybrid mechanism", () => {
  it("passes on a real render even though the global pixel top-margin threshold would flag it", async () => {
    const response = renderHybridTextOverlay({
      baseImageDataUri: await solidBaseImage(),
      title: "Secador De Cabelos Philco PSC3500 4 Em 1 Dobrável Motor BLDC",
      currentPrice: 498.9,
      referencePrice: 709.0,
      hasConfirmedDiscount: true,
      benefits: ["4 FUNÇÕES EM 1", "DOBRÁVEL FÁCIL DE GUARDAR"],
    });
    const buf = await toBuffer(response);
    const result = checkHybridMarginSafety({
      title: "Secador De Cabelos Philco PSC3500 4 Em 1 Dobrável Motor BLDC",
      currentPrice: 498.9,
      referencePrice: 709.0,
      hasConfirmedDiscount: true,
      benefits: ["4 FUNÇÕES EM 1", "DOBRÁVEL FÁCIL DE GUARDAR"],
      canvasWidth: CREATIVE_FINAL_DIMENSIONS.width,
      canvasHeight: CREATIVE_FINAL_DIMENSIONS.height,
      preBarImageBuffer: buf,
      ctaBarHeightFraction: CTA_BAR_HEIGHT_FRACTION,
    });
    expect(result.safe).toBe(true);
    expect(result.layoutViolations).toEqual([]);
    expect(result.pixelViolations).toEqual([]);
  });
});

async function solidBaseImage(): Promise<string> {
  const res = new ImageResponse(
    <div style={{ width: CREATIVE_FINAL_DIMENSIONS.width, height: CREATIVE_FINAL_DIMENSIONS.height, display: "flex", background: "#2a2a2a" }} />,
    { width: CREATIVE_FINAL_DIMENSIONS.width, height: CREATIVE_FINAL_DIMENSIONS.height },
  );
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
}
