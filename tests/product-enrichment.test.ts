import { describe, expect, it } from "vitest";
import { summarizePriceHistory } from "@/lib/product/price-summary";
import {
  guideForCategory,
  CATEGORY_GUIDES,
} from "@/lib/product/category-guides";
import { OFFER_CATEGORIES } from "@/lib/offers/categories";
import { pickSimilarOffers } from "@/lib/queries/similar-offers";
import { setIndexableProductSlugsForTest } from "@/lib/seo/indexable-product-links";
import type { UnifiedOfferCard } from "@/lib/queries/unified-offers";

const d = (n: number) => new Date(2026, 8, n);

describe("summarizePriceHistory", () => {
  it("returns null with fewer than two observations", () => {
    expect(summarizePriceHistory([], 10)).toBeNull();
    expect(
      summarizePriceHistory([{ price: 10, observedAt: d(1) }], 10),
    ).toBeNull();
  });
  it("finds range and position", () => {
    const h = [
      { price: 100, observedAt: d(1) },
      { price: 80, observedAt: d(5) },
      { price: 120, observedAt: d(9) },
    ];
    const s = summarizePriceHistory(h, 80)!;
    expect(s).toMatchObject({
      observations: 3,
      min: 80,
      max: 120,
      position: "at-low",
    });
    expect(summarizePriceHistory(h, 120)!.position).toBe("at-high");
    expect(summarizePriceHistory(h, 100)!.position).toBe("middle");
  });
  it("flat when the price never moved", () => {
    const h = [
      { price: 50, observedAt: d(1) },
      { price: 50, observedAt: d(2) },
    ];
    expect(summarizePriceHistory(h, 50)!.position).toBe("flat");
  });
});

describe("category guides", () => {
  it("covers every real category except outros and falls back otherwise", () => {
    for (const c of OFFER_CATEGORIES.filter((c) => c.slug !== "outros")) {
      expect(CATEGORY_GUIDES[c.slug]?.checks.length).toBeGreaterThan(1);
    }
    expect(guideForCategory("outros").checks.length).toBeGreaterThan(1);
  });
});

function card(
  id: string,
  cat: string,
  slug: string | null,
  image = "x.jpg",
): UnifiedOfferCard {
  return {
    id,
    merchant: "SHOPEE",
    title: `Produto ${id}`,
    imageUrl: image,
    currentPrice: 10,
    referencePrice: null,
    discountPercent: null,
    rating: null,
    soldQuantity: null,
    opportunitySignal: null,
    href: `/go/shopee/${id}`,
    categorySlug: cat,
    detailHref: slug ? `/produto/${slug}` : undefined,
  };
}

describe("pickSimilarOffers", () => {
  it("returns same-category indexable pages, not itself", () => {
    setIndexableProductSlugsForTest(["a", "b", "c"]);
    const pool = [
      card("1", "pet", "a"),
      card("2", "pet", "b"),
      card("3", "casa", "c"),
      card("4", "pet", null),
      card("5", "pet", "z"),
    ];
    const r = pickSimilarOffers(pool, { slug: "a", title: "Racao", limit: 8 });
    expect(r.categorySlug).toBe("pet");
    expect(r.items.map((i) => i.id)).toEqual(["2"]);
    setIndexableProductSlugsForTest(null);
  });
  it("shows nothing for the catch-all category", () => {
    const pool = [card("1", "outros", "a"), card("2", "outros", "b")];
    expect(
      pickSimilarOffers(pool, { slug: "a", title: "xyz", limit: 8 }).items,
    ).toEqual([]);
  });
});
