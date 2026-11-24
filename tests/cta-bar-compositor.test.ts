import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodePng, pixelAt } from "./helpers/png-decode";

/**
 * Owner's directive, 2026-11-24 ("não considere um teste de presença de
 * texto como prova — quero ver"): this is a REAL render, through the
 * actual Satori/next-og pipeline this project already uses, decoded
 * pixel-by-pixel with a small, dependency-free PNG decoder (tests/
 * helpers/png-decode.ts) — not a mock, not a text-presence check. Two
 * tiny synthetic fixtures (committed, never the real approved assets)
 * stand in for the real base image and the real CTA bar: a solid blue
 * base (tests/fixtures/cta-base.synthetic.png, 40×80) and a solid
 * magenta bar (tests/fixtures/cta-bar.synthetic.png, 40×10 — chosen so
 * 10/80 = 0.125, close to the real measured CTA_BAR_HEIGHT_FRACTION of
 * 0.12625, so Math.round(80 * 0.12625) = 10 lands exactly on the
 * fixture's own height with no scaling surprises). Proves the function
 * actually composites the real bar asset's pixels onto the bottom
 * region, not that a prompt mentions one.
 */

describe("computeCtaBarPlacement — pure arithmetic, the real measured 0.12625 proportion", () => {
  it("computes the bar height/position from the real reference measurement, scaled to any canvas size", async () => {
    const { computeCtaBarPlacement, CTA_BAR_HEIGHT_FRACTION } = await import("@/lib/services/ai-creative-factory/compositor");
    expect(CTA_BAR_HEIGHT_FRACTION).toBeCloseTo(0.12625, 5);

    // Today's real output canvas (compositor.tsx's FINAL_WIDTH/HEIGHT).
    const real = computeCtaBarPlacement(1080, 1350);
    expect(real.barWidth).toBe(1080);
    expect(real.barHeight).toBe(Math.round(1350 * 0.12625)); // 170
    expect(real.barY).toBe(1350 - real.barHeight);

    // A differently-sized image (owner's directive: never assume every
    // file is exactly 1080×1350) scales the same proportion correctly.
    const other = computeCtaBarPlacement(800, 1000);
    expect(other.barHeight).toBe(Math.round(1000 * 0.12625)); // 126
    expect(other.barY).toBe(1000 - other.barHeight);
  });
});

describe("compositeDeterministicCtaBar — real render, decoded pixel-by-pixel", () => {
  beforeEach(() => {
    // lib/config/env.ts freezes `process.env` into a module-level
    // singleton on first import — vi.stubEnv alone has no effect on a
    // module already cached from an earlier test (e.g. the
    // computeCtaBarPlacement describe block above, which imports this
    // same module with no stub active). vi.resetModules() forces the
    // next dynamic import to re-evaluate env.ts against the current,
    // correctly-stubbed process.env.
    vi.resetModules();
    vi.stubEnv("VITRINE_CTA_BAR_ASSET_PATH", "tests/fixtures/cta-bar.synthetic.png");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("paints the real bar asset's pixels onto the bottom region, leaving the base image's pixels everywhere above it", async () => {
    const { compositeDeterministicCtaBar } = await import("@/lib/services/ai-creative-factory/compositor");
    const baseBuffer = readFileSync(new URL("./fixtures/cta-base.synthetic.png", import.meta.url));
    const baseDataUri = `data:image/png;base64,${baseBuffer.toString("base64")}`;

    const resultBuffer = await compositeDeterministicCtaBar({ baseImageDataUri: baseDataUri, width: 40, height: 80 });
    const png = decodePng(resultBuffer);

    expect(png.width).toBe(40);
    expect(png.height).toBe(80);

    // Deep inside the base region (well above the bar) — must be the
    // base fixture's real blue, not the bar's magenta.
    const basePixel = pixelAt(png, 20, 30);
    expect(basePixel.r).toBeLessThan(40);
    expect(basePixel.g).toBeLessThan(40);
    expect(basePixel.b).toBeGreaterThan(200);

    // Deep inside the bar region (barY = 80 - round(80*0.12625) = 70) —
    // must be the bar fixture's real magenta, proving the real asset's
    // pixels were painted here, not the AI base image's.
    const barPixel = pixelAt(png, 20, 75);
    expect(barPixel.r).toBeGreaterThan(200);
    expect(barPixel.g).toBeLessThan(40);
    expect(barPixel.b).toBeGreaterThan(200);
  });

  it("throws CtaBarAssetMissingError, never silently falls back to a blank/transparent region, when the asset file doesn't exist", async () => {
    vi.stubEnv("VITRINE_CTA_BAR_ASSET_PATH", "/tmp/this-cta-bar-does-not-exist-on-purpose.png");
    const { compositeDeterministicCtaBar, CtaBarAssetMissingError } = await import("@/lib/services/ai-creative-factory/compositor");
    const baseBuffer = readFileSync(new URL("./fixtures/cta-base.synthetic.png", import.meta.url));

    await expect(
      compositeDeterministicCtaBar({ baseImageDataUri: `data:image/png;base64,${baseBuffer.toString("base64")}`, width: 40, height: 80 }),
    ).rejects.toBeInstanceOf(CtaBarAssetMissingError);
  });
});
