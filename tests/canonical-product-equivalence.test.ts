import { describe, expect, it } from "vitest";
import {
  evaluateCanonicalEquivalence,
  extractVariantAttributes,
  VARIANT_DEFINING_ATTRIBUTE_IDS,
} from "@/lib/services/canonical-product-equivalence";

/**
 * Owner's directive, 2026-11-21 ("Produtos Philco — aprovado com
 * restrições"): never auto-merge by brand+model alone. The real Philco
 * case (confirmed live via GET /products/{id}) is the anchor fixture
 * here — MLB49652036 (127V) and MLB50269368 (220V) share brand="Philco"
 * and model="PSC3500" but are genuinely different, non-interchangeable
 * commercial variants.
 */

describe("extractVariantAttributes — only the curated, variant-relevant ids", () => {
  it("picks VOLTAGE/COLOR and ignores irrelevant attributes (real Philco 127V shape)", () => {
    const result = extractVariantAttributes([
      { id: "BRAND", value_name: "Philco" },
      { id: "MODEL", value_name: "PSC3500" },
      { id: "COLOR", value_name: "Bege" },
      { id: "VOLTAGE", value_name: "127V" },
      { id: "PACKAGE_DATA_SOURCE", value_name: "CERTIFIED_MEASUREMENT" },
      { id: "IS_FOLDABLE", value_name: "Não" },
    ]);
    expect(result).toEqual({ COLOR: "Bege", VOLTAGE: "127V" });
  });

  it("ignores attributes with null value_name", () => {
    const result = extractVariantAttributes([{ id: "VOLTAGE", value_name: null }]);
    expect(result).toEqual({});
  });

  it("returns empty object when attributes is undefined", () => {
    expect(extractVariantAttributes(undefined)).toEqual({});
  });

  it("covers every documented variant-defining id at least by name (sanity check against drift)", () => {
    expect(VARIANT_DEFINING_ATTRIBUTE_IDS).toContain("VOLTAGE");
    expect(VARIANT_DEFINING_ATTRIBUTE_IDS).toContain("COLOR");
    expect(VARIANT_DEFINING_ATTRIBUTE_IDS).toContain("TANK_VOLUME");
  });
});

describe("evaluateCanonicalEquivalence — never merges on brand+model alone", () => {
  it("the real Philco case: same brand+model, different VOLTAGE → DISTINCT, never merged", () => {
    const mlb49652036 = { brand: "Philco", model: "PSC3500", variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } };
    const mlb50269368 = { brand: "Philco", model: "PSC3500", variantAttributes: { COLOR: "Bege", VOLTAGE: "220V" } };
    const verdict = evaluateCanonicalEquivalence(mlb49652036, mlb50269368);
    expect(verdict.decision).toBe("distinct");
    expect(verdict.conflictingAttributes).toContain("VOLTAGE");
    expect(verdict.matchedAttributes).toContain("COLOR");
  });

  it("confirms real equivalence only with positive matching attribute evidence, not just absence of conflict", () => {
    const a = { brand: "Philco", model: "PSC3500", variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } };
    const b = { brand: "philco", model: "psc3500", variantAttributes: { COLOR: "bege", VOLTAGE: "127v" } };
    const verdict = evaluateCanonicalEquivalence(a, b);
    expect(verdict.decision).toBe("equivalent");
    expect(verdict.matchedAttributes.sort()).toEqual(["COLOR", "VOLTAGE"]);
    expect(verdict.conflictingAttributes).toEqual([]);
  });

  it("never auto-merges on brand+model alone when there is zero shared variant-attribute data — ambiguous, for human review", () => {
    const a = { brand: "Tssaper", model: "TP550", variantAttributes: {} };
    const b = { brand: "Tssaper", model: "TP550", variantAttributes: {} };
    const verdict = evaluateCanonicalEquivalence(a, b);
    expect(verdict.decision).toBe("ambiguous");
  });

  it("ambiguous when brand or model is missing on either side — never assumes", () => {
    expect(
      evaluateCanonicalEquivalence(
        { brand: null, model: "PSC3500", variantAttributes: {} },
        { brand: "Philco", model: "PSC3500", variantAttributes: {} },
      ).decision,
    ).toBe("ambiguous");
    expect(
      evaluateCanonicalEquivalence(
        { brand: "Philco", model: null, variantAttributes: {} },
        { brand: "Philco", model: "PSC3500", variantAttributes: {} },
      ).decision,
    ).toBe("ambiguous");
  });

  it("different model → ambiguous (not a false 'distinct' claim; brand+model mismatch is handled before attribute comparison)", () => {
    const verdict = evaluateCanonicalEquivalence(
      { brand: "Philco", model: "PSC3500", variantAttributes: { VOLTAGE: "127V" } },
      { brand: "Philco", model: "PSA3300", variantAttributes: { VOLTAGE: "127V" } },
    );
    expect(verdict.decision).toBe("ambiguous");
  });

  it("partial overlap: one matching and one conflicting attribute still forces distinct (conflict always wins)", () => {
    const verdict = evaluateCanonicalEquivalence(
      { brand: "Philco", model: "PSC3500", variantAttributes: { COLOR: "Bege", VOLTAGE: "127V" } },
      { brand: "Philco", model: "PSC3500", variantAttributes: { COLOR: "Bege", VOLTAGE: "220V" } },
    );
    expect(verdict.decision).toBe("distinct");
  });

  it("an attribute present on only one side contributes no signal (not counted as matched or conflicting)", () => {
    const verdict = evaluateCanonicalEquivalence(
      { brand: "Tssaper", model: "TP550", variantAttributes: { VOLTAGE: "127V" } },
      { brand: "Tssaper", model: "TP550", variantAttributes: { COLOR: "Azul" } },
    );
    expect(verdict.matchedAttributes).toEqual([]);
    expect(verdict.conflictingAttributes).toEqual([]);
    expect(verdict.decision).toBe("ambiguous");
  });
});
