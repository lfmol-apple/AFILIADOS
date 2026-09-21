import { describe, expect, it } from "vitest";
import {
  SHOPEE_SWEEP_KEYWORDS,
  SWEEP_KEYWORDS_PER_CYCLE,
  SWEEP_MAX_NEW_PER_CYCLE,
  planSweep,
  selectNewSweepOffers,
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
