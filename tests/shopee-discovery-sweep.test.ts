import { describe, expect, it } from "vitest";
import {
  SHOPEE_SWEEP_KEYWORDS,
  SWEEP_KEYWORDS_PER_CYCLE,
  SWEEP_MAX_NEW_PER_CYCLE,
  planSweep,
  selectNewSweepOffers,
  AMS_MAX_PAGE,
  AMS_MIN_COMMISSION_BRL,
  AMS_PAGES_PER_CYCLE,
  planAmsSweep,
  selectExtraCommissionOffers,
} from "@/lib/services/shopee-discovery-sweep";
import type { ShopeeProductOfferNode } from "@/lib/providers/shopee-provider";

function offer(
  id: number,
  over: Partial<ShopeeProductOfferNode> = {},
): ShopeeProductOfferNode {
  return {
    itemId: id,
    productName: `Produto ${id}`,
    sales: 500,
    ratingStar: "4.8",
    commissionRate: "0.10",
    ...over,
  } as ShopeeProductOfferNode;
}

describe("planSweep", () => {
  it("is deterministic and asks for several keyword/page pairs", () => {
    expect(planSweep(3)).toEqual(planSweep(3));
    expect(planSweep(0)).toHaveLength(SWEEP_KEYWORDS_PER_CYCLE * 2);
  });

  it("covers every keyword over one lap and then moves to deeper pages", () => {
    const cyclesPerLap =
      SHOPEE_SWEEP_KEYWORDS.length / SWEEP_KEYWORDS_PER_CYCLE;
    const seen = new Set<string>();
    for (let i = 0; i < cyclesPerLap; i += 1)
      planSweep(i).forEach((r) => seen.add(r.keyword));
    expect(seen.size).toBe(SHOPEE_SWEEP_KEYWORDS.length);
    const firstLapPages = new Set(planSweep(0).map((r) => r.page));
    const secondLapPages = new Set(planSweep(cyclesPerLap).map((r) => r.page));
    expect([...secondLapPages].every((p) => !firstLapPages.has(p))).toBe(true);
  });
});

describe("selectNewSweepOffers", () => {
  it("drops known, duplicate, low-sales and low-rated offers", () => {
    const picked = selectNewSweepOffers(
      [
        offer(1),
        offer(2, { sales: 5 }),
        offer(3, { ratingStar: "3.9" }),
        offer(4, { ratingStar: undefined }),
        offer(5),
        offer(5),
        offer(6),
      ],
      new Set(["1"]),
    );
    expect(picked.map((o) => o.itemId).sort()).toEqual([5, 6]);
  });

  it("prefers higher-commission offers and caps the count", () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      offer(100 + i, { commissionRate: i === 39 ? "0.30" : "0.05" }),
    );
    const picked = selectNewSweepOffers(many, new Set());
    expect(picked).toHaveLength(SWEEP_MAX_NEW_PER_CYCLE);
    expect(picked[0]!.itemId).toBe(139);
  });
});

describe("planAmsSweep", () => {
  it("asks for a few consecutive pages, wraps inside 1..AMS_MAX_PAGE and is deterministic", () => {
    expect(planAmsSweep(0)).toEqual([1, 2, 3]);
    expect(planAmsSweep(1)).toEqual([4, 5, 6]);
    expect(planAmsSweep(4)).toEqual(planAmsSweep(4));
    const all = new Set<number>();
    const cyclesPerLap = Math.ceil(AMS_MAX_PAGE / AMS_PAGES_PER_CYCLE) * 2;
    for (let i = 0; i < cyclesPerLap; i += 1)
      planAmsSweep(i).forEach((p) => all.add(p));
    expect([...all].every((p) => p >= 1 && p <= AMS_MAX_PAGE)).toBe(true);
    expect(all.size).toBe(AMS_MAX_PAGE);
  });
});

describe("selectExtraCommissionOffers", () => {
  const extra = (id: number, over: Partial<ShopeeProductOfferNode> = {}) =>
    offer(id, {
      commission: "20",
      sellerCommissionRate: "0.10",
      sales: 1000,
      ratingStar: "4.8",
      ...over,
    });

  it("keeps only new offers with extra commission, enough sales, rating and R$ per sale", () => {
    const picked = selectExtraCommissionOffers(
      [
        extra(1),
        extra(2, { sellerCommissionRate: "0" }),
        extra(3, { sellerCommissionRate: undefined }),
        extra(4, { sales: 499 }),
        extra(5, { ratingStar: "4.4" }),
        extra(6, { commission: String(AMS_MIN_COMMISSION_BRL - 0.01) }),
        extra(7, { commission: undefined }),
        extra(8),
        extra(8),
        extra(9),
      ],
      new Set(["1"]),
    );
    expect(picked.map((o) => o.itemId).sort()).toEqual([8, 9]);
  });

  it("orders by commission in reais, then most sold, then best rated, and caps the count", () => {
    const picked = selectExtraCommissionOffers(
      [
        extra(1, { commission: "15", sales: 9000 }),
        extra(2, { commission: "40", sales: 600 }),
        extra(3, { commission: "15", sales: 9000, ratingStar: "5" }),
        extra(4, { commission: "15", sales: 20000 }),
      ],
      new Set(),
    );
    expect(picked.map((o) => o.itemId)).toEqual([2, 4, 3, 1]);
    expect(
      selectExtraCommissionOffers(
        Array.from({ length: 40 }, (_, i) => extra(100 + i)),
        new Set(),
      ),
    ).toHaveLength(25);
  });
});
