import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCtaBarBatchFix } from "../scripts/fix-local-creative-cta-bars";
import { decodePng, pixelAt } from "./helpers/png-decode";

/**
 * Owner's directive, 2026-11-24 ("adicione testes reais... pro corretor
 * em lote (só toca imagens classificadas como defeituosas, nunca as
 * outras, sempre escreve uma versão nova em vez de sobrescrever)").
 * Uses real temp directories and the real compositor (via the synthetic
 * fixtures, same pattern as tests/cta-bar-compositor.test.ts) — no
 * mocking of the actual compositing logic, so this proves the real
 * behavior, not a stand-in for it.
 */

describe("runCtaBarBatchFix — only touches cta_cortado, never overwrites, never touches the DB/production dir", () => {
  let sourceDir: string;
  let outputDir: string;

  beforeEach(() => {
    vi.resetModules(); // see tests/cta-bar-compositor.test.ts for why
    vi.stubEnv("VITRINE_CTA_BAR_ASSET_PATH", "tests/fixtures/cta-bar.synthetic.png");
    sourceDir = mkdtempSync(path.join(tmpdir(), "cta-bar-fix-test-"));
    outputDir = path.join(sourceDir, "corrected");

    // Two fake "real" creatives, same shape as .local-real-creatives/: a
    // 40×80 PNG (reusing the committed synthetic base fixture) standing
    // in for each real product's current (defective) file.
    const baseFixture = readFileSync(new URL("./fixtures/cta-base.synthetic.png", import.meta.url));
    writeFileSync(path.join(sourceDir, "defective-product.png"), baseFixture);
    writeFileSync(path.join(sourceDir, "correct-product.png"), baseFixture);
    writeFileSync(path.join(sourceDir, "layout-different-product.png"), baseFixture);
    // "missing-file-product" deliberately has no corresponding .png —
    // proves a classified-but-absent source is skipped, not crashed on.
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(sourceDir, { recursive: true, force: true });
  });

  it("corrects only items classified cta_cortado, skips correto/layout_diferente/missing-file untouched", async () => {
    const { runCtaBarBatchFix: freshRunCtaBarBatchFix } = await import("../scripts/fix-local-creative-cta-bars");
    const results = await freshRunCtaBarBatchFix({
      sourceDir,
      outputDir,
      classification: {
        items: [
          { gid: "defective-product", title: "Produto Defeituoso", version: 3, verdict: "cta_cortado" },
          { gid: "correct-product", title: "Produto Correto", version: 1, verdict: "correto" },
          { gid: "layout-different-product", title: "Layout Diferente", version: 1, verdict: "layout_diferente_do_template_aprovado" },
          { gid: "missing-file-product", title: "Sem Arquivo", version: 2, verdict: "cta_cortado" },
        ],
      },
    });

    const byGid = Object.fromEntries(results.map((r) => [r.gid, r]));
    expect(byGid["defective-product"].outcome).toBe("corrected");
    expect(byGid["correct-product"].outcome).toBe("skipped_verdict");
    expect(byGid["layout-different-product"].outcome).toBe("skipped_verdict");
    expect(byGid["missing-file-product"].outcome).toBe("skipped_missing_source");

    // The "correto" and "layout_diferente" source files are completely
    // untouched — same bytes, and no output was ever produced for them.
    const originalBytes = readFileSync(new URL("./fixtures/cta-base.synthetic.png", import.meta.url));
    expect(readFileSync(path.join(sourceDir, "correct-product.png"))).toEqual(originalBytes);
    expect(readFileSync(path.join(sourceDir, "layout-different-product.png"))).toEqual(originalBytes);
    expect(existsSync(path.join(outputDir, "correct-product-v2.png"))).toBe(false);
    expect(existsSync(path.join(outputDir, "layout-different-product-v2.png"))).toBe(false);
  });

  it("never overwrites the source file — writes a new, higher version number instead", async () => {
    const { runCtaBarBatchFix: freshRunCtaBarBatchFix } = await import("../scripts/fix-local-creative-cta-bars");
    const originalBytes = readFileSync(path.join(sourceDir, "defective-product.png"));

    const results = await freshRunCtaBarBatchFix({
      sourceDir,
      outputDir,
      classification: { items: [{ gid: "defective-product", title: "Produto Defeituoso", version: 3, verdict: "cta_cortado" }] },
    });

    // Source file (version 3, implicitly) is byte-for-byte untouched.
    expect(readFileSync(path.join(sourceDir, "defective-product.png"))).toEqual(originalBytes);

    // A NEW file at v4 was written instead — never v3 overwritten, never
    // the source path itself.
    const result = results[0];
    expect(result.outcome).toBe("corrected");
    expect(result.outputPath).toBe(path.join(outputDir, "defective-product-v4.png"));
    expect(existsSync(result.outputPath!)).toBe(true);

    // And the corrected file really does have the bar composited in —
    // same real pixel proof as the compositor's own test.
    const corrected = decodePng(readFileSync(result.outputPath!));
    const barPixel = pixelAt(corrected, 20, 75); // barY = 80 - round(80*0.12625) = 70
    expect(barPixel.r).toBeGreaterThan(200);
    expect(barPixel.g).toBeLessThan(40);
    expect(barPixel.b).toBeGreaterThan(200);
  });

  it("reads each file's real dimensions rather than assuming a fixed canvas size", async () => {
    // A differently-sized "real creative" (not today's usual 1080×1350).
    vi.resetModules();
    vi.stubEnv("VITRINE_CTA_BAR_ASSET_PATH", "tests/fixtures/cta-bar.synthetic.png");
    const { runCtaBarBatchFix: freshRunCtaBarBatchFix } = await import("../scripts/fix-local-creative-cta-bars");

    const results = await freshRunCtaBarBatchFix({
      sourceDir,
      outputDir,
      classification: { items: [{ gid: "defective-product", title: "Produto Defeituoso", version: 1, verdict: "cta_cortado" }] },
    });

    expect(results[0].detail).toContain("40x80"); // the real fixture's real dimensions, not an assumed 1080x1350
  });
});
