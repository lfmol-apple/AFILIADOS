import { describe, expect, it } from "vitest";
import { offerQualityScore, getDiscountPercent } from "@/lib/services/ml-offer-quality";
import type {
  MercadoLivreCatalogItem,
  MercadoLivreSellerReputation,
} from "@/lib/providers/mercado-livre-provider";

function makeItem(overrides: Partial<MercadoLivreCatalogItem> = {}): MercadoLivreCatalogItem {
  return {
    item_id: "MLB1",
    seller_id: 1,
    price: 100,
    original_price: null,
    currency_id: "BRL",
    condition: "new",
    ...overrides,
  };
}

describe("getDiscountPercent", () => {
  it("returns null when there is no original_price (no discount signal — never fabricated)", () => {
    expect(getDiscountPercent(makeItem({ original_price: null }))).toBeNull();
  });

  it("returns null when original_price is not actually higher than price", () => {
    expect(getDiscountPercent(makeItem({ price: 100, original_price: 100 }))).toBeNull();
  });

  it("returns the real fraction when there is a genuine discount", () => {
    expect(getDiscountPercent(makeItem({ price: 700, original_price: 1000 }))).toBeCloseTo(0.3);
  });
});

describe("offerQualityScore", () => {
  it("never guesses a seller reputation bonus when the seller is unrecognized/absent (UNKNOWN stays UNKNOWN)", () => {
    const withNullSeller = offerQualityScore(makeItem(), null);
    const withUnrecognizedLevel = offerQualityScore(
      makeItem(),
      { sellerId: 1, nickname: "x", levelId: "some_new_level_ml_never_documented", powerSellerStatus: null, transactionsTotal: 5 },
    );
    expect(withNullSeller).toBe(withUnrecognizedLevel);
  });

  it("rewards new condition, free shipping, a real discount, and green reputation — all real, confirmed-live signals", () => {
    const base = offerQualityScore(makeItem({ condition: "used" }), null);
    const withNew = offerQualityScore(makeItem({ condition: "new" }), null);
    expect(withNew).toBeGreaterThan(base);

    const withShipping = offerQualityScore(
      makeItem({ shipping: { free_shipping: true } }),
      null,
    );
    const withoutShipping = offerQualityScore(makeItem({ shipping: { free_shipping: false } }), null);
    expect(withShipping).toBeGreaterThan(withoutShipping);

    const withDiscount = offerQualityScore(makeItem({ price: 700, original_price: 1000 }), null);
    const noDiscount = offerQualityScore(makeItem({ price: 700, original_price: null }), null);
    expect(withDiscount).toBeGreaterThan(noDiscount);

    const greenSeller: MercadoLivreSellerReputation = {
      sellerId: 1,
      nickname: "x",
      levelId: "5_green",
      powerSellerStatus: "silver",
      transactionsTotal: 100,
    };
    const redSeller: MercadoLivreSellerReputation = { ...greenSeller, levelId: "1_red" };
    expect(offerQualityScore(makeItem(), greenSeller)).toBeGreaterThan(
      offerQualityScore(makeItem(), redSeller),
    );
  });

  it("always stays within [0, 100]", () => {
    const worst = offerQualityScore(
      makeItem({ condition: "used", shipping: { free_shipping: false } }),
      { sellerId: 1, nickname: "x", levelId: "1_red", powerSellerStatus: null, transactionsTotal: 0 },
    );
    const best = offerQualityScore(
      makeItem({ condition: "new", shipping: { free_shipping: true }, price: 1, original_price: 1000 }),
      { sellerId: 1, nickname: "x", levelId: "5_green", powerSellerStatus: "platinum", transactionsTotal: 9999 },
    );
    expect(worst).toBeGreaterThanOrEqual(0);
    expect(best).toBeLessThanOrEqual(100);
  });
});
