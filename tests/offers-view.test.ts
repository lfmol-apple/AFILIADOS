import { describe, expect, it } from "vitest";
import { offersHref, parseOffersView } from "@/lib/offers/view";

describe("parseOffersView", () => {
  it("defaults to no category, relevance order and every store", () => {
    expect(parseOffersView({})).toEqual({
      category: null,
      sort: "relevancia",
      store: null,
    });
  });

  it("reads valid values", () => {
    expect(
      parseOffersView({ categoria: "pet", ordem: "desconto", loja: "shopee" }),
    ).toEqual({
      category: "pet",
      sort: "desconto",
      store: "shopee",
    });
  });

  it("falls back to defaults for unknown or repeated values instead of failing", () => {
    expect(
      parseOffersView({ categoria: "amazon", ordem: "x", loja: "y" }),
    ).toEqual({
      category: null,
      sort: "relevancia",
      store: null,
    });
    expect(parseOffersView({ categoria: ["casa", "pet"], ordem: [] })).toEqual({
      category: "casa",
      sort: "relevancia",
      store: null,
    });
  });
});

describe("offersHref", () => {
  const base = { category: null, sort: "relevancia" as const, store: null };

  it("keeps /ofertas clean when everything is default", () => {
    expect(offersHref(base)).toBe("/ofertas");
  });

  it("includes only non-default choices and keeps the others when one changes", () => {
    const view = {
      category: "pet",
      sort: "menor-preco" as const,
      store: "shopee" as const,
    };
    expect(offersHref(view)).toBe(
      "/ofertas?categoria=pet&ordem=menor-preco&loja=shopee",
    );
    expect(offersHref(view, { category: "casa" })).toBe(
      "/ofertas?categoria=casa&ordem=menor-preco&loja=shopee",
    );
    expect(offersHref(view, { category: null })).toBe(
      "/ofertas?ordem=menor-preco&loja=shopee",
    );
    expect(offersHref(view, { sort: "relevancia", store: null })).toBe(
      "/ofertas?categoria=pet",
    );
  });
});
