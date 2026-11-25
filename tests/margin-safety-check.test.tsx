import { describe, it, expect } from "vitest";
import { ImageResponse } from "next/og";
import { checkTopMargin, checkReservedBottomZone, TOP_MARGIN_MAX_EDGE_DENSITY, RESERVED_ZONE_MAX_EDGE_DENSITY } from "@/lib/services/ai-creative-factory/margin-safety-check";

/**
 * Owner's directive, 2026-11-24 ("avalie uma área de segurança que
 * impeça tecnicamente o corte"): proves the deterministic gate actually
 * separates a clean margin from a violated one — real rendered PNGs
 * through the same Satori/next-og pipeline the real pipeline uses
 * (never hand-built byte arrays), small and synthetic so this stays
 * fast and the repo stays light. The real calibration data (15 real
 * images from today's validation runs) lives as a comment in
 * margin-safety-check.ts; this suite proves the DECISION LOGIC against
 * clear-cut synthetic cases on both sides of each threshold.
 */
const WIDTH = 200;
const HEIGHT = 300;

async function render(node: React.ReactElement): Promise<Buffer> {
  const res = new ImageResponse(node, { width: WIDTH, height: HEIGHT });
  return Buffer.from(await res.arrayBuffer());
}

describe("checkTopMargin — deterministic, no AI judgment involved", () => {
  it("passes a flat, low-contrast background with nothing drawn in the top margin", async () => {
    const buf = await render(
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", background: "#888888" }} />,
    );
    const result = checkTopMargin(buf, 18);
    expect(result.safe).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("fails when a high-contrast block (text/logo stand-in) sits inside the top margin", async () => {
    const buf = await render(
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", background: "#888888", position: "relative" }}>
        {/* A checkerboard-like block of hard black/white edges in the top 18% (0-54px of 300) — stands in for real typography, which the production renders also produce as sharp edges. */}
        <div style={{ position: "absolute", top: 10, left: 10, width: 120, height: 30, display: "flex", background: "repeating-linear-gradient(90deg, #000000 0px, #000000 4px, #ffffff 4px, #ffffff 8px)" }} />
      </div>,
    );
    const result = checkTopMargin(buf, 18);
    expect(result.safe).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].zone).toBe("top");
    expect(result.violations[0].edgeDensity).toBeGreaterThan(TOP_MARGIN_MAX_EDGE_DENSITY);
  });

  it("ignores high-contrast content OUTSIDE the top margin zone", async () => {
    const buf = await render(
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", background: "#888888", position: "relative" }}>
        {/* Same busy block, but placed well below the 18% top zone (54px) — must not trip the check. */}
        <div style={{ position: "absolute", top: 150, left: 10, width: 120, height: 30, display: "flex", background: "repeating-linear-gradient(90deg, #000000 0px, #000000 4px, #ffffff 4px, #ffffff 8px)" }} />
      </div>,
    );
    const result = checkTopMargin(buf, 18);
    expect(result.safe).toBe(true);
  });
});

describe("checkReservedBottomZone — checked on the PRE-bar image, never the final composited one", () => {
  it("passes when the reserved band is left empty (real background only)", async () => {
    const buf = await render(
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", background: "#2a2a2a" }} />,
    );
    const result = checkReservedBottomZone(buf, 0.12625);
    expect(result.safe).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("fails when a high-contrast block (price badge stand-in) invades the reserved band", async () => {
    const reservedStart = Math.round(HEIGHT * (1 - 0.12625)); // ~262
    const buf = await render(
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", background: "#2a2a2a", position: "relative" }}>
        <div style={{ position: "absolute", top: reservedStart - 15, left: 5, width: 100, height: 40, display: "flex", background: "repeating-linear-gradient(90deg, #cc0000 0px, #cc0000 4px, #ffdd00 4px, #ffdd00 8px)" }} />
      </div>,
    );
    const result = checkReservedBottomZone(buf, 0.12625);
    expect(result.safe).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].zone).toBe("bottom_reserved");
    expect(result.violations[0].edgeDensity).toBeGreaterThan(RESERVED_ZONE_MAX_EDGE_DENSITY);
  });

  it("passes when the same high-contrast block sits entirely ABOVE the reserved band", async () => {
    const reservedStart = Math.round(HEIGHT * (1 - 0.12625));
    const buf = await render(
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", background: "#2a2a2a", position: "relative" }}>
        <div style={{ position: "absolute", top: reservedStart - 60, left: 5, width: 100, height: 40, display: "flex", background: "repeating-linear-gradient(90deg, #cc0000 0px, #cc0000 4px, #ffdd00 4px, #ffdd00 8px)" }} />
      </div>,
    );
    const result = checkReservedBottomZone(buf, 0.12625);
    expect(result.safe).toBe(true);
  });
});
