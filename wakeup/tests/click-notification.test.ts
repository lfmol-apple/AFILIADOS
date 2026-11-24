import { describe, expect, it } from "vitest";
import { describeAffiliateClickForOwner } from "@/lib/analytics/click-notification";

describe("describeAffiliateClickForOwner", () => {
  it("names the store and carries the product label through", () => {
    expect(
      describeAffiliateClickForOwner("mercado-livre", "Escova Secadora Philco"),
    ).toEqual({
      title: "🔔 Clique para Mercado Livre",
      body: "Escova Secadora Philco",
      url: "/admin/desempenho",
    });
    expect(
      describeAffiliateClickForOwner("shopee", "Kit Potes Herméticos"),
    ).toEqual({
      title: "🔔 Clique para Shopee",
      body: "Kit Potes Herméticos",
      url: "/admin/desempenho",
    });
    expect(describeAffiliateClickForOwner("amazon", "iPhone 16")).toEqual({
      title: "🔔 Clique para Amazon",
      body: "iPhone 16",
      url: "/admin/desempenho",
    });
  });

  it("an unknown merchant code degrades to itself as the label, never throws", () => {
    expect(describeAffiliateClickForOwner("awin", "Produto X").title).toBe(
      "🔔 Clique para awin",
    );
  });
});
