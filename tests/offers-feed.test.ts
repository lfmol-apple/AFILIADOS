import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UnifiedOfferCard } from "@/lib/queries/unified-offers";
import {
  countByCategory,
  interleaveByMerchant,
  paginateOffers,
  sortOffers,
} from "@/lib/queries/offers-feed";

function card(id: number, categorySlug: string): UnifiedOfferCard {
  return {
    id: String(id),
    merchant: "SHOPEE",
    title: `Oferta ${id}`,
    imageUrl: null,
    currentPrice: null,
    referencePrice: null,
    discountPercent: null,
    rating: null,
    soldQuantity: null,
    opportunitySignal: 100 - id,
    href: `/go/shopee/${id}`,
    categorySlug,
  };
}

const cards = Array.from({ length: 60 }, (_, i) =>
  card(i + 1, i % 3 === 0 ? "pet" : i % 3 === 1 ? "casa" : "outros"),
);

describe("paginateOffers", () => {
  it("returns pages in ranked order without overlap and flags the last page", () => {
    const p1 = paginateOffers(cards, { page: 1, pageSize: 24 });
    const p2 = paginateOffers(cards, { page: 2, pageSize: 24 });
    const p3 = paginateOffers(cards, { page: 3, pageSize: 24 });
    expect(p1.items.map((c) => c.id)).toEqual(
      cards.slice(0, 24).map((c) => c.id),
    );
    expect(p2.items[0].id).toBe("25");
    expect(p1.hasMore).toBe(true);
    expect(p2.hasMore).toBe(true);
    expect(p3.items).toHaveLength(12);
    expect(p3.hasMore).toBe(false);
    expect(p1.total).toBe(60);
  });

  it("filters by category before paging and keeps the ranking", () => {
    const pets = paginateOffers(cards, {
      category: "pet",
      page: 1,
      pageSize: 5,
    });
    expect(pets.total).toBe(20);
    expect(pets.items.every((c) => c.categorySlug === "pet")).toBe(true);
    expect(pets.items.map((c) => c.opportunitySignal)).toEqual(
      [...pets.items.map((c) => c.opportunitySignal)].sort(
        (a, b) => (b ?? 0) - (a ?? 0),
      ),
    );
    expect(pets.hasMore).toBe(true);
  });

  it("ignores an unknown category and clamps a bad page number", () => {
    expect(
      paginateOffers(cards, { category: "amazon", page: 1, pageSize: 10 })
        .total,
    ).toBe(60);
    expect(paginateOffers(cards, { page: -3, pageSize: 10 }).page).toBe(1);
    expect(paginateOffers(cards, { page: 99, pageSize: 10 }).items).toEqual([]);
  });
});

describe("sortOffers and store filter", () => {
  const mk = (
    id: number,
    patch: Partial<UnifiedOfferCard>,
  ): UnifiedOfferCard => ({ ...card(id, "casa"), ...patch });

  const list = [
    mk(1, { currentPrice: 50, discountPercent: 0.1, merchant: "SHOPEE" }),
    mk(2, {
      currentPrice: null,
      discountPercent: null,
      merchant: "MERCADO_LIVRE",
    }),
    mk(3, {
      currentPrice: 20,
      discountPercent: 0.5,
      merchant: "MERCADO_LIVRE",
    }),
    mk(4, { currentPrice: 20, discountPercent: 0.3, merchant: "SHOPEE" }),
  ];

  it("keeps the ranked order for 'relevancia'", () => {
    expect(sortOffers(list, "relevancia").map((c) => c.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("sorts by biggest discount, with offers lacking a discount last", () => {
    expect(sortOffers(list, "desconto").map((c) => c.id)).toEqual([
      "3",
      "4",
      "1",
      "2",
    ]);
  });

  it("sorts by lowest price, stable for ties, with unknown prices last", () => {
    expect(sortOffers(list, "menor-preco").map((c) => c.id)).toEqual([
      "3",
      "4",
      "1",
      "2",
    ]);
  });

  it("does not mutate its input", () => {
    const before = list.map((c) => c.id);
    sortOffers(list, "menor-preco");
    expect(list.map((c) => c.id)).toEqual(before);
  });

  it("filters by store before paging and combines with category and sort", () => {
    const res = paginateOffers(list, { store: "shopee", sort: "menor-preco" });
    expect(res.items.map((c) => c.id)).toEqual(["4", "1"]);
    expect(res.total).toBe(2);
    expect(
      paginateOffers(list, { store: "mercado-livre", category: "pet" }).total,
    ).toBe(0);
  });
});

describe("countByCategory", () => {
  it("lists only non-empty categories, biggest first, 'outros' last", () => {
    const extraPets = Array.from({ length: 5 }, (_, i) => card(200 + i, "pet"));
    const counts = countByCategory([...cards, ...extraPets]);
    expect(counts.map((c) => c.slug)).toEqual(["pet", "casa", "outros"]);
    expect(counts.find((c) => c.slug === "pet")?.count).toBe(25);
    const manyOutros = countByCategory([
      ...cards,
      ...Array.from({ length: 30 }, (_, i) => card(100 + i, "outros")),
    ]);
    expect(manyOutros[manyOutros.length - 1].slug).toBe("outros");
  });
});

describe("GET /api/ofertas", () => {
  beforeEach(() => vi.resetModules());

  it("rejects an unknown category and an out-of-range page", async () => {
    vi.doMock("@/lib/queries/offers-feed", () => ({ listOffers: vi.fn() }));
    const { GET } = await import("@/app/api/ofertas/route");
    expect(
      (await GET(new Request("http://x/api/ofertas?categoria=amazon"))).status,
    ).toBe(400);
    expect((await GET(new Request("http://x/api/ofertas?page=0"))).status).toBe(
      400,
    );
    expect(
      (await GET(new Request("http://x/api/ofertas?page=101"))).status,
    ).toBe(400);
  });

  it("rejects an unknown sort or store", async () => {
    vi.doMock("@/lib/queries/offers-feed", () => ({ listOffers: vi.fn() }));
    const { GET } = await import("@/app/api/ofertas/route");
    expect(
      (await GET(new Request("http://x/api/ofertas?ordem=barato"))).status,
    ).toBe(400);
    expect(
      (await GET(new Request("http://x/api/ofertas?loja=amazonia"))).status,
    ).toBe(400);
  });

  it("passes sort and store through to the feed", async () => {
    const listOffers = vi.fn(async () => ({
      items: [],
      page: 1,
      total: 0,
      hasMore: false,
    }));
    vi.doMock("@/lib/queries/offers-feed", () => ({ listOffers }));
    const { GET } = await import("@/app/api/ofertas/route");
    await GET(new Request("http://x/api/ofertas?ordem=desconto&loja=shopee"));
    expect(listOffers).toHaveBeenCalledWith({
      category: undefined,
      sort: "desconto",
      store: "shopee",
      page: 1,
    });
  });

  it("passes a valid category and page to the feed", async () => {
    const listOffers = vi.fn(async () => ({
      items: [],
      page: 2,
      total: 0,
      hasMore: false,
    }));
    vi.doMock("@/lib/queries/offers-feed", () => ({ listOffers }));
    const { GET } = await import("@/app/api/ofertas/route");
    const res = await GET(
      new Request("http://x/api/ofertas?categoria=pet&page=2"),
    );
    expect(res.status).toBe(200);
    expect(listOffers).toHaveBeenCalledWith({
      category: "pet",
      sort: undefined,
      store: undefined,
      page: 2,
    });
  });
});

import {
  matchesQuery,
  retagForSearch,
  searchPoolCards,
} from "@/lib/queries/offers-feed";

describe("search over the full pool", () => {
  it("matches every word in any order, ignoring accents and case", () => {
    expect(
      matchesQuery(
        "Creatina Monohidratada 500g em Pó (Growth)",
        "creatina growth",
      ),
    ).toBe(true);
    expect(matchesQuery("Ração Úmida para Gatos", "RACAO gatos")).toBe(true);
    expect(matchesQuery("Creatina Monohidratada", "creatina whey")).toBe(false);
    expect(matchesQuery("Qualquer coisa", "   ")).toBe(false);
  });

  it("re-tags the outbound link as coming from search and keeps everything else", () => {
    const c = {
      ...card(1, "pet"),
      href: "/go/shopee/123?pageType=ofertas&pageSlug=ofertas&source=ofertas",
      detailHref: "/produto/x",
    };
    const out = retagForSearch(c, "ração gato");
    const url = new URL(out.href as string, "https://x.invalid");
    expect(url.pathname).toBe("/go/shopee/123");
    expect(url.searchParams.get("source")).toBe("search");
    expect(url.searchParams.get("campaign")).toBe("ração gato");
    expect(url.searchParams.get("pageType")).toBe("ofertas");
    expect(out.detailHref).toBe("/produto/x");
    expect(c.href).toContain("source=ofertas"); // input untouched
  });

  it("returns only matching marketplace offers, best signal first, never Amazon", () => {
    const pool = [
      {
        ...card(1, "pet"),
        title: "Ração gatos adultos",
        opportunitySignal: 40,
        href: "/go/shopee/1?source=ofertas",
      },
      {
        ...card(2, "pet"),
        title: "Ração gatos filhotes",
        opportunitySignal: 90,
        href: "/go/shopee/2?source=ofertas",
      },
      {
        ...card(3, "pet"),
        title: "Ração gatos amazon",
        merchant: "AMAZON" as const,
        opportunitySignal: 99,
      },
      {
        ...card(4, "casa"),
        title: "Tapete",
        opportunitySignal: 95,
        href: "/go/shopee/4?source=ofertas",
      },
    ];
    expect(searchPoolCards(pool, "racao gatos").map((c) => c.id)).toEqual([
      "2",
      "1",
    ]);
  });
});

describe("interleaveByMerchant", () => {
  const mk = (
    id: string,
    merchant: UnifiedOfferCard["merchant"],
    signal: number,
  ): UnifiedOfferCard => ({
    ...card(0, "casa"),
    id,
    merchant,
    opportunitySignal: signal,
  });

  it("mixes the stores in proportion and keeps each store's own order", () => {
    // 6 Shopee and 3 Mercado Livre; ML scores higher, so a plain sort would put all 3 first
    const ranked = [
      mk("m1", "MERCADO_LIVRE", 99),
      mk("m2", "MERCADO_LIVRE", 98),
      mk("m3", "MERCADO_LIVRE", 97),
      mk("s1", "SHOPEE", 80),
      mk("s2", "SHOPEE", 79),
      mk("s3", "SHOPEE", 78),
      mk("s4", "SHOPEE", 77),
      mk("s5", "SHOPEE", 76),
      mk("s6", "SHOPEE", 75),
    ];
    const out = interleaveByMerchant(ranked);
    expect(out).toHaveLength(9);
    // never a run of 3 ML in a row, and roughly 2 Shopee : 1 ML through the list
    expect(out.slice(0, 3).map((c) => c.merchant)).toContain("SHOPEE");
    expect(
      out.slice(0, 6).filter((c) => c.merchant === "MERCADO_LIVRE"),
    ).toHaveLength(2);
    // each store's internal ranking is untouched
    expect(out.filter((c) => c.merchant === "SHOPEE").map((c) => c.id)).toEqual(
      ["s1", "s2", "s3", "s4", "s5", "s6"],
    );
    expect(
      out.filter((c) => c.merchant === "MERCADO_LIVRE").map((c) => c.id),
    ).toEqual(["m1", "m2", "m3"]);
  });

  it("leaves a single-store list as it is and never drops or repeats a card", () => {
    const one = [mk("a", "SHOPEE", 3), mk("b", "SHOPEE", 2)];
    expect(interleaveByMerchant(one)).toEqual(one);
    const many = Array.from({ length: 40 }, (_, i) =>
      mk(`x${i}`, i % 4 === 0 ? "MERCADO_LIVRE" : "SHOPEE", 100 - i),
    );
    const out = interleaveByMerchant(many);
    expect(new Set(out.map((c) => c.id)).size).toBe(40);
  });
});
