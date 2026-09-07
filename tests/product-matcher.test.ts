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
    const a = listing({ id: "a", title: "Fone Bluetooth XPTO", gtin: "7891234567890" });
    const b = listing({ id: "b", title: "Fone sem fio marca XPTO (novo)", gtin: "7891234567890" });
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
    const a = listing({ id: "a", gtin: "111" });
    const b = listing({ id: "b", gtin: "111" });
    const result = matchListings(a, b);
    expect(result?.evidence.detail).toBeTypeOf("object");
    expect(Object.keys(result?.evidence.detail ?? {}).length).toBeGreaterThan(0);
  });
});
