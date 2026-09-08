import { describe, expect, it } from "vitest";
import { matchListings } from "@/lib/services/product-matcher";
import type { MatchableListing } from "@/types/product-match";

function listing(overrides: Partial<MatchableListing>): MatchableListing {
  return {
    id: "listing-1",
    title: "Produto genérico",
    ...overrides,
  };
}

describe("matchListings", () => {
  it("confirms a match on identical GTIN, regardless of title differences", () => {
    // A real, check-digit-valid EAN-13 (the well-known GS1 example
    // barcode) — see lib/services/gtin.ts, added when this test's
    // original placeholder value turned out to fail real GTIN validation.
    const a = listing({ id: "a", title: "Fone Bluetooth XPTO", gtin: "4006381333931" });
    const b = listing({ id: "b", title: "Fone sem fio marca XPTO (novo)", gtin: "4006381333931" });
    const result = matchListings(a, b);
    expect(result?.method).toBe("GTIN");
    expect(result?.status).toBe("CONFIRMED");
    expect(result?.confidence).toBe(1);
  });

  it("confirms a match on identical manufacturer id when GTIN is absent", () => {
    const a = listing({ id: "a", manufacturerId: "MPN-12345" });
    const b = listing({ id: "b", manufacturerId: "mpn-12345 " }); // case/whitespace-insensitive
    const result = matchListings(a, b);
    expect(result?.method).toBe("MANUFACTURER_ID");
    expect(result?.status).toBe("CONFIRMED");
  });

  it("never silently confirms a brand+model match — always CANDIDATE", () => {
    const a = listing({ id: "a", brand: "Samsung", model: "Galaxy A54" });
    const b = listing({ id: "b", brand: "samsung", model: "galaxy a54" });
    const result = matchListings(a, b);
    expect(result?.method).toBe("BRAND_MODEL");
    expect(result?.status).toBe("CANDIDATE");
  });

  it("never silently confirms a textual-only match — always CANDIDATE, with capped confidence", () => {
    const a = listing({
      id: "a",
      title: "Air Fryer Mondial 4 Litros Digital AFN400 Preta 220V",
    });
    const b = listing({
      id: "b",
      title: "Air Fryer Mondial 4 Litros Digital AFN400 Preta - Voltagem 220V",
    });
    const result = matchListings(a, b);
    expect(result?.method).toBe("TEXTUAL_CANDIDATE");
    expect(result?.status).toBe("CANDIDATE");
    expect(result?.confidence).toBeLessThanOrEqual(0.6);
  });

  it("protects against false positives — unrelated titles produce no match at all", () => {
    const a = listing({ id: "a", title: "Air Fryer Mondial 4 litros digital preta" });
    const b = listing({ id: "b", title: "Cadeira gamer reclinável com apoio de braço" });
    const result = matchListings(a, b);
    expect(result).toBeNull();
  });

  it("GTIN takes priority over a weaker signal even if brand+model also matches", () => {
    const a = listing({
      id: "a",
      brand: "Positivo",
      model: "Q464C",
      gtin: "7891111111111",
    });
    const b = listing({
      id: "b",
      brand: "Positivo",
      model: "Q464C",
      gtin: "7892222222222", // different real product, same brand/model name
    });
    const result = matchListings(a, b);
    // Different GTINs mean these are NOT compared as a GTIN match, but the
    // brand+model still lines up — falls through to a CANDIDATE, not a
    // false CONFIRMED via the strong path.
    expect(result?.method).toBe("BRAND_MODEL");
    expect(result?.status).toBe("CANDIDATE");
  });

  it("returns null for a listing compared against itself", () => {
    const a = listing({ id: "same" });
    expect(matchListings(a, a)).toBeNull();
  });

  it("every returned match carries concrete evidence, never a bare boolean", () => {
    const a = listing({ id: "a", gtin: "4006381333931" });
    const b = listing({ id: "b", gtin: "4006381333931" });
    const result = matchListings(a, b);
    expect(result?.evidence.detail).toBeTypeOf("object");
    expect(Object.keys(result?.evidence.detail ?? {}).length).toBeGreaterThan(0);
  });

  it("every match also carries the matcher version, for future rule-change auditing", () => {
    const a = listing({ id: "a", gtin: "4006381333931" });
    const b = listing({ id: "b", gtin: "4006381333931" });
    const result = matchListings(a, b);
    expect(result?.evidence.matcherVersion).toBe("v1");
  });

  it("rejects a GTIN-shaped value with an invalid check digit — equal garbage is still garbage, never CONFIRMED via GTIN", () => {
    const a = listing({ id: "a", gtin: "7891234567890" }); // wrong check digit
    const b = listing({ id: "b", gtin: "7891234567890" });
    const result = matchListings(a, b);
    // Both listings share the same default title ("Produto genérico"), so
    // this correctly falls through to a real TEXTUAL_CANDIDATE match — the
    // point under test is that it is NOT a GTIN/CONFIRMED result despite
    // the two "GTIN" strings being textually identical.
    expect(result?.method).toBe("TEXTUAL_CANDIDATE");
    expect(result?.status).toBe("CANDIDATE");
  });

  it("rejects a too-short numeric value as a GTIN (never a real barcode length)", () => {
    const a = listing({ id: "a", gtin: "111", title: "Produto A totalmente diferente" });
    const b = listing({ id: "b", gtin: "111", title: "Produto B sem nenhuma relação" });
    expect(matchListings(a, b)).toBeNull();
  });

  it("real, structurally valid GTINs that are simply different never match, even with identical brand+model", () => {
    const a = listing({ id: "a", brand: "Samsung", model: "Galaxy A17", gtin: "4006381333931" });
    const b = listing({ id: "b", brand: "Samsung", model: "Galaxy A17", gtin: "7891111111111" }); // also valid, but different
    const result = matchListings(a, b);
    expect(result?.method).toBe("BRAND_MODEL");
    expect(result?.status).toBe("CANDIDATE");
  });

  describe("variant guard — storage/voltage/tier conflicts (real risk found in this app's own production data)", () => {
    it("blocks a BRAND_MODEL match when the titles disagree on storage capacity", () => {
      const a = listing({
        id: "a",
        brand: "Samsung",
        model: "Galaxy A17",
        title: "Celular Samsung Galaxy A17 128GB 4GB Ram",
      });
      const b = listing({
        id: "b",
        brand: "Samsung",
        model: "Galaxy A17",
        title: "Celular Samsung Galaxy A17 256GB 8GB Ram",
      });
      expect(matchListings(a, b)).toBeNull();
    });

    it("does NOT block a BRAND_MODEL match when storage is equal but color differs — same product, different SKU is a legitimate candidate", () => {
      const a = listing({
        id: "a",
        brand: "Samsung",
        model: "Galaxy A17",
        title: "Celular Samsung Galaxy A17 128GB Preto",
      });
      const b = listing({
        id: "b",
        brand: "Samsung",
        model: "Galaxy A17",
        title: "Celular Samsung Galaxy A17 128GB Cinza",
      });
      const result = matchListings(a, b);
      expect(result?.method).toBe("BRAND_MODEL");
      expect(result?.status).toBe("CANDIDATE");
    });

    it("blocks a TEXTUAL_CANDIDATE match when the titles disagree on voltage", () => {
      const a = listing({ id: "a", title: "Air Fryer Mondial 4 Litros Digital AFN400 Preta 110V" });
      const b = listing({ id: "b", title: "Air Fryer Mondial 4 Litros Digital AFN400 Preta 220V" });
      expect(matchListings(a, b)).toBeNull();
    });

    it("blocks a match when both titles mention a tier word and they conflict (iPhone 16 vs iPhone 16 Pro)", () => {
      const a = listing({ id: "a", brand: "Apple", model: "iPhone 16", title: "iPhone 16 128GB Preto" });
      const b = listing({ id: "b", brand: "Apple", model: "iPhone 16", title: "iPhone 16 Pro 128GB Preto" });
      expect(matchListings(a, b)).toBeNull();
    });

    it("real production example: two real ML canonical products (iPhone 17, 512GB vs 256GB) correctly do not match despite the same model string", () => {
      const a = listing({
        id: "a",
        brand: "Apple",
        model: "iPhone 17",
        title: "iPhone 17 512 GB - Azul-névoa - Distribuidor Autorizado",
      });
      const b = listing({
        id: "b",
        brand: "Apple",
        model: "iPhone 17",
        title: "iPhone 17 de 256 GB - Lavanda - Distribuidor Autorizado",
      });
      expect(matchListings(a, b)).toBeNull();
    });
  });
});
