import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { env } from "@/lib/config/env";

/**
 * Owner's directive, 2026-11-24 ("estabeleça uma versão oficial,
 * protegida e documentada do padrão visual aprovado... não pode depender
 * de... pasta gitignored"): the two real visual assets every one-shot
 * generation depends on (the style reference sent to the AI, and the
 * deterministic CTA bar composited afterward) must be committed,
 * versioned files — never only a host bind mount or a path on someone's
 * Mac. This proves both defaults actually resolve to a real, present,
 * byte-identical-to-what-Henrique-approved file, so a future change that
 * accidentally breaks this (wrong path, missing commit, silently
 * replaced asset) fails a test instead of failing a real paid
 * generation in production.
 */
describe("Henrique visual standard — real assets are committed, versioned, and byte-identical to what was approved", () => {
  it("VITRINE_HENRIQUE_STYLE_REFERENCE_PATH defaults to a committed public/ file, not a gitignored data/ path", () => {
    expect(env.VITRINE_HENRIQUE_STYLE_REFERENCE_PATH).toBe("public/vitrine/henrique-style-reference.png");
    const resolved = path.join(process.cwd(), env.VITRINE_HENRIQUE_STYLE_REFERENCE_PATH);
    expect(existsSync(resolved)).toBe(true);
  });

  it("the committed style-reference file is byte-identical to the one Henrique's 3 approved pilots actually used", () => {
    // Hash pinned in docs/henrique-visual-standard/SPEC.md and
    // docs/henrique-visual-reference/MANIFESTO.md (2026-11-21) — this is
    // not a convenience checksum, it's the proof this is the SAME file,
    // never an accidental re-export or a different crop/compression of
    // the original art.
    const resolved = path.join(process.cwd(), env.VITRINE_HENRIQUE_STYLE_REFERENCE_PATH);
    const hash = createHash("sha256").update(readFileSync(resolved)).digest("hex");
    expect(hash).toBe("d157c33851b7c15513335042d0105fb35281f03c882d2db500c9f22882303a90");
  });

  it("VITRINE_CTA_BAR_ASSET_PATH defaults to a committed public/ file", () => {
    expect(env.VITRINE_CTA_BAR_ASSET_PATH).toBe("public/vitrine/cta-bar-1080w.png");
    const resolved = path.join(process.cwd(), env.VITRINE_CTA_BAR_ASSET_PATH);
    expect(existsSync(resolved)).toBe(true);
  });

  it("docs/henrique-visual-standard/ exists and is not gitignored (the frozen spec + historical record)", () => {
    const specPath = path.join(process.cwd(), "docs/henrique-visual-standard/SPEC.md");
    expect(existsSync(specPath)).toBe(true);
    const approvedReferencePath = path.join(process.cwd(), "docs/henrique-visual-standard/pilot-3-tssaper-APROVADO.png");
    expect(existsSync(approvedReferencePath)).toBe(true);
  });
});
