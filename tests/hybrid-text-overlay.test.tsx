import { describe, it, expect } from "vitest";
import { renderHybridTextOverlay, fitFontSize, splitTitleIntoTwoLines, toBuffer, CTA_BAR_HEIGHT_FRACTION, CREATIVE_FINAL_DIMENSIONS } from "@/lib/services/ai-creative-factory/compositor";
import { checkReservedBottomZone } from "@/lib/services/ai-creative-factory/margin-safety-check";
import { ImageResponse } from "next/og";

/**
 * Owner's directive, 2026-11-25 ("Secador Philco — solução definitiva
 * ... código determinístico responsável pelo título, preço, faixa...
 * margens e posicionamento controlados matematicamente"): proves the
 * real failure mode (price badge invading the reserved CTA-bar band,
 * confirmed twice on real Secador generations under the AI-drawn
 * approach) is now structurally impossible — not just less likely —
 * because the badge's position is computed backward from the reserved
 * zone's real boundary, never asked for in prose.
 */
async function solidBaseImage(): Promise<string> {
  const res = new ImageResponse(
    <div style={{ width: CREATIVE_FINAL_DIMENSIONS.width, height: CREATIVE_FINAL_DIMENSIONS.height, display: "flex", background: "#2a2a2a" }} />,
    { width: CREATIVE_FINAL_DIMENSIONS.width, height: CREATIVE_FINAL_DIMENSIONS.height },
  );
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buf.toString("base64")}`;
}

describe("fitFontSize — never returns a size whose estimated width exceeds the box", () => {
  it("keeps the max size when the text comfortably fits", () => {
    expect(fitFontSize("Curto", 1000, 64, 36)).toBe(64);
  });

  it("shrinks a long string down from the max size", () => {
    const longTitle = "Lavadora De Alta Pressão Kärcher Prática Black 1500 Psi";
    const size = fitFontSize(longTitle, 968, 64, 36);
    expect(size).toBeLessThan(64);
    expect(size).toBeGreaterThanOrEqual(36);
  });

  it("never goes below the floor even for an extremely long string", () => {
    const veryLong = "Palavra ".repeat(40);
    expect(fitFontSize(veryLong, 968, 64, 36)).toBe(36);
  });
});

describe("splitTitleIntoTwoLines — balanced, word-boundary split", () => {
  it("splits a short title into 2 roughly balanced lines", () => {
    const [l1, l2] = splitTitleIntoTwoLines("Secador De Cabelos Philco PSC3500");
    expect(l1.length).toBeGreaterThan(0);
    expect(l2.length).toBeGreaterThan(0);
    expect(`${l1} ${l2}`).toBe("Secador De Cabelos Philco PSC3500");
  });

  it("never splits mid-word", () => {
    const [l1, l2] = splitTitleIntoTwoLines("Lavadora De Alta Pressão Kärcher");
    const words = "Lavadora De Alta Pressão Kärcher".split(" ");
    expect(words).toContain(l1.split(" ").pop());
    expect(words).toContain(l2.split(" ")[0]);
  });

  it("returns the whole title on line 1 and empty line 2 for a single word", () => {
    const [l1, l2] = splitTitleIntoTwoLines("Whey");
    expect(l1).toBe("Whey");
    expect(l2).toBe("");
  });
});

describe("renderHybridTextOverlay — the price badge structurally cannot invade the reserved CTA-bar zone", () => {
  it("passes the deterministic margin-safety check for a normal product with a real discount", async () => {
    const baseImage = await solidBaseImage();
    const response = renderHybridTextOverlay({
      baseImageDataUri: baseImage,
      title: "Secador De Cabelos Philco PSC3500 4 Em 1 Dobrável Motor BLDC",
      currentPrice: 498.9,
      referencePrice: 709.0,
      hasConfirmedDiscount: true,
      benefits: ["4 FUNÇÕES EM 1", "DOBRÁVEL FÁCIL DE GUARDAR"],
    });
    const buf = await toBuffer(response);
    const result = checkReservedBottomZone(buf, CTA_BAR_HEIGHT_FRACTION);
    expect(result.safe).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("still passes with an extremely long title that needed font shrinking", async () => {
    const baseImage = await solidBaseImage();
    const response = renderHybridTextOverlay({
      baseImageDataUri: baseImage,
      title: "Lavadora de Alta Pressão Electrolux 1850PSI 1500W Potência com Canhão de Espuma PowerWash EWS1850P Preta Lava Jato Lava Car",
      currentPrice: 450.53,
      referencePrice: 698.57,
      hasConfirmedDiscount: true,
      benefits: ["1500W DE POTÊNCIA", "CANHÃO DE ESPUMA POWERWASH"],
    });
    const buf = await toBuffer(response);
    const result = checkReservedBottomZone(buf, CTA_BAR_HEIGHT_FRACTION);
    expect(result.safe).toBe(true);
  });

  it("still passes with no confirmed discount (no crossed-out price line)", async () => {
    const baseImage = await solidBaseImage();
    const response = renderHybridTextOverlay({
      baseImageDataUri: baseImage,
      title: "Fritadeira Elétrica Air Fryer Quad Fry Elgin",
      currentPrice: 179.0,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });
    const buf = await toBuffer(response);
    const result = checkReservedBottomZone(buf, CTA_BAR_HEIGHT_FRACTION);
    expect(result.safe).toBe(true);
  });

  it("produces the real final dimensions", async () => {
    const baseImage = await solidBaseImage();
    const response = renderHybridTextOverlay({
      baseImageDataUri: baseImage,
      title: "Produto Teste",
      currentPrice: 99.9,
      referencePrice: null,
      hasConfirmedDiscount: false,
      benefits: [],
    });
    const buf = await toBuffer(response);
    // PNG IHDR width/height, big-endian, at fixed offsets — cheap sanity
    // check without pulling in the full decoder for just this assertion.
    expect(buf.readUInt32BE(16)).toBe(CREATIVE_FINAL_DIMENSIONS.width);
    expect(buf.readUInt32BE(20)).toBe(CREATIVE_FINAL_DIMENSIONS.height);
  });
});
