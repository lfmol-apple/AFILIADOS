import { describe, expect, it } from "vitest";
import { generateCandidatePairs, type MatchCandidateInput } from "@/lib/services/product-match-candidates";

function input(overrides: Partial<MatchCandidateInput>): MatchCandidateInput {
  return {
    id: "id",
    title: "Produto genérico",
    group: "MERCADO_LIVRE",
    ...overrides,
  };
}

function hasPair(pairs: ReturnType<typeof generateCandidatePairs>, idA: string, idB: string) {
  return pairs.some(
    (p) => (p.a.id === idA && p.b.id === idB) || (p.a.id === idB && p.b.id === idA),
  );
}

describe("generateCandidatePairs", () => {
  it("pairs two listings that share a real, valid GTIN, even within the same merchant group", () => {
    const listings = [
      input({ id: "a", group: "MERCADO_LIVRE", gtin: "4006381333931" }),
      input({ id: "b", group: "MERCADO_LIVRE", gtin: "4006381333931" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(hasPair(pairs, "a", "b")).toBe(true);
  });

  it("never proposes a pair from an invalid GTIN alone (no other shared signal)", () => {
    const listings = [
      input({ id: "a", group: "MERCADO_LIVRE", gtin: "111", title: "Cadeira gamer reclinável" }),
      input({ id: "b", group: "SHOPEE", gtin: "111", title: "Ração úmida para gatos sabores variados" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(hasPair(pairs, "a", "b")).toBe(false);
  });

  it("pairs cross-merchant listings sharing normalized brand+model", () => {
    const listings = [
      input({ id: "ml1", group: "MERCADO_LIVRE", brand: "Samsung", model: "Galaxy A17" }),
      input({ id: "shopee1", group: "SHOPEE", brand: "Samsung", model: "Galaxy A17" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(hasPair(pairs, "ml1", "shopee1")).toBe(true);
  });

  it("does NOT pair two listings sharing brand+model within the SAME merchant group — that's already handled elsewhere (canonicalProductId), not this tier's job", () => {
    const listings = [
      input({ id: "ml1", group: "MERCADO_LIVRE", brand: "Samsung", model: "Galaxy A17" }),
      input({ id: "ml2", group: "MERCADO_LIVRE", brand: "Samsung", model: "Galaxy A17" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(hasPair(pairs, "ml1", "ml2")).toBe(false);
  });

  it("pairs cross-merchant listings only when they share a significant title token (textual blocking)", () => {
    const listings = [
      input({ id: "ml1", group: "MERCADO_LIVRE", title: "Fone de Ouvido Bluetooth Anker Soundcore P30i" }),
      input({ id: "shopee1", group: "SHOPEE", title: "Fone Bluetooth sem fio Soundcore original" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(hasPair(pairs, "ml1", "shopee1")).toBe(true);
  });

  it("never proposes a textual pair for two listings sharing zero significant tokens — this is the 'no blind N×N' guarantee", () => {
    const listings = [
      input({ id: "ml1", group: "MERCADO_LIVRE", title: "Celular Samsung Galaxy A17 128GB Preto" }),
      input({ id: "shopee1", group: "SHOPEE", title: "Ração úmida Friskies Sabores Variados para Gatos" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(pairs).toHaveLength(0);
  });

  it("does NOT pair two same-merchant listings via textual similarity either — cross-group only for the heuristic tiers", () => {
    const listings = [
      input({ id: "ml1", group: "MERCADO_LIVRE", title: "Fone de Ouvido Bluetooth Anker Soundcore P30i Preto" }),
      input({ id: "ml2", group: "MERCADO_LIVRE", title: "Fone de Ouvido Bluetooth Anker Soundcore P30i Verde" }),
    ];
    const pairs = generateCandidatePairs(listings);
    expect(hasPair(pairs, "ml1", "ml2")).toBe(false);
  });

  it("never proposes a listing paired with itself", () => {
    const listings = [input({ id: "a", gtin: "4006381333931" })];
    const pairs = generateCandidatePairs(listings);
    expect(pairs.every((p) => p.a.id !== p.b.id)).toBe(true);
  });

  it("never proposes the same pair twice, even when multiple tiers would independently suggest it", () => {
    // Shares GTIN AND brand+model AND a textual token — should still
    // appear exactly once in the output.
    const listings = [
      input({ id: "ml1", group: "MERCADO_LIVRE", gtin: "4006381333931", brand: "Samsung", model: "Galaxy A17", title: "Celular Samsung Galaxy A17" }),
      input({ id: "shopee1", group: "SHOPEE", gtin: "4006381333931", brand: "Samsung", model: "Galaxy A17", title: "Celular Samsung Galaxy A17" }),
    ];
    const pairs = generateCandidatePairs(listings);
    const matching = pairs.filter(
      (p) => (p.a.id === "ml1" && p.b.id === "shopee1") || (p.a.id === "shopee1" && p.b.id === "ml1"),
    );
    expect(matching).toHaveLength(1);
  });

  it("scales sub-quadratically in practice: a large batch of mutually unrelated listings produces zero candidate pairs, not a blind full scan", () => {
    const listings: MatchCandidateInput[] = [];
    for (let i = 0; i < 50; i++) {
      listings.push(
        input({
          id: `ml-${i}`,
          group: "MERCADO_LIVRE",
          title: `Produto totalmente singular numero ${i} xyzqwk${i}`,
        }),
      );
      listings.push(
        input({
          id: `shopee-${i}`,
          group: "SHOPEE",
          title: `Item completamente distinto codigo ${i} abcjklm${i}`,
        }),
      );
    }
    const pairs = generateCandidatePairs(listings);
    expect(pairs).toHaveLength(0);
  });
});
