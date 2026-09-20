import { describe, expect, it } from "vitest";
import { MAX_FEED_PAGE, offersHref, parseOffersView } from "@/lib/offers/view";
import { buildOffersMetadata } from "@/lib/offers/seo";

const view = (patch: Partial<Parameters<typeof offersHref>[0]> = {}) => ({
  category: null,
  sort: "relevancia" as const,
  store: null,
  page: 1,
  ...patch,
});

describe("parseOffersView", () => {
  it("defaults to no category, relevance order, every store and page 1", () => {
    expect(parseOffersView({})).toEqual(view());
  });

  it("reads valid values", () => {
    expect(
      parseOffersView({
        categoria: "pet",
        ordem: "desconto",
        loja: "shopee",
        pagina: "3",
      }),
    ).toEqual(
      view({ category: "pet", sort: "desconto", store: "shopee", page: 3 }),
    );
  });

  it("falls back to defaults for unknown or malformed values instead of failing", () => {
    expect(
      parseOffersView({
        categoria: "amazon",
        ordem: "x",
        loja: "y",
        pagina: "abc",
      }),
    ).toEqual(view());
    expect(
      parseOffersView({
        categoria: ["casa", "pet"],
        ordem: [],
        pagina: ["2", "5"],
      }),
    ).toEqual(view({ category: "casa", page: 2 }));
    expect(parseOffersView({ pagina: "0" }).page).toBe(1);
    expect(parseOffersView({ pagina: "-4" }).page).toBe(1);
    expect(parseOffersView({ pagina: "2.5" }).page).toBe(1);
    expect(parseOffersView({ pagina: "999999" }).page).toBe(MAX_FEED_PAGE);
  });
});

describe("offersHref", () => {
  it("keeps /ofertas clean when everything is default", () => {
    expect(offersHref(view())).toBe("/ofertas");
  });

  it("includes only non-default choices and keeps the others when one changes", () => {
    const v = view({ category: "pet", sort: "menor-preco", store: "shopee" });
    expect(offersHref(v)).toBe(
      "/ofertas?categoria=pet&ordem=menor-preco&loja=shopee",
    );
    expect(offersHref(v, { category: "casa" })).toBe(
      "/ofertas?categoria=casa&ordem=menor-preco&loja=shopee",
    );
    expect(offersHref(v, { category: null })).toBe(
      "/ofertas?ordem=menor-preco&loja=shopee",
    );
    expect(offersHref(v, { sort: "relevancia", store: null })).toBe(
      "/ofertas?categoria=pet",
    );
  });

  it("puts the page in the URL and goes back to page 1 when category, sort or store change", () => {
    const v = view({ category: "pet", page: 4 });
    expect(offersHref(v)).toBe("/ofertas?categoria=pet"); // unset override → page reset
    expect(offersHref(v, { page: 4 })).toBe("/ofertas?categoria=pet&pagina=4");
    expect(offersHref(v, { page: 5 })).toBe("/ofertas?categoria=pet&pagina=5");
    expect(offersHref(v, { category: "casa" })).toBe("/ofertas?categoria=casa");
    expect(offersHref(v, { page: 1 })).toBe("/ofertas?categoria=pet");
  });
});

describe("buildOffersMetadata", () => {
  const meta = (
    v = view(),
    extra: { indexable?: boolean; hasQuery?: boolean } = {},
  ) =>
    buildOffersMetadata({
      view: v,
      indexable: extra.indexable ?? true,
      hasQuery: extra.hasQuery ?? false,
    });

  it("the base page is indexable with itself as canonical", () => {
    const m = meta();
    expect(m.alternates?.canonical).toBe("/ofertas");
    expect(m.robots).toBeUndefined();
    expect(m.title).toBe("Ofertas");
  });

  it("a category is a real landing page: own title, description and self canonical", () => {
    const m = meta(view({ category: "pet" }));
    expect(m.title).toBe("Ofertas de Pet");
    expect(String(m.description)).toContain("Pet");
    expect(m.alternates?.canonical).toBe("/ofertas?categoria=pet");
    expect(m.robots).toBeUndefined();
  });

  it("pagination pages canonical to themselves and say which page they are", () => {
    const m = meta(view({ category: "casa", page: 3 }));
    expect(m.alternates?.canonical).toBe("/ofertas?categoria=casa&pagina=3");
    expect(m.title).toBe("Ofertas de Casa e Decoração — página 3");
  });

  it("sort and store variants are noindex and canonical to the view without them", () => {
    const m = meta(
      view({ category: "pet", sort: "desconto", store: "shopee" }),
    );
    expect(m.robots).toEqual({ index: false, follow: true });
    expect(m.alternates?.canonical).toBe("/ofertas?categoria=pet");
  });

  it("search results and a page with no real offers are never indexed", () => {
    expect(meta(view(), { hasQuery: true }).robots).toEqual({
      index: false,
      follow: true,
    });
    expect(
      meta(view({ category: "pet" }), { indexable: false }).robots,
    ).toEqual({ index: false, follow: true });
  });
});
