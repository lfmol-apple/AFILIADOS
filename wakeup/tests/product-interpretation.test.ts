import { describe, expect, it } from "vitest";
import { interpretProduct } from "@/lib/services/ai-creative-factory/product-interpretation";

describe("interpretProduct — owner's requirement, 2026-11-20 ('Evolução da Fábrica de Criativos'): real, traceable benefits only, never invented", () => {
  it("extracts real specs the seller already wrote in the title, each with its exact source quote — the real Fritadeira Elgin case", () => {
    const profile = interpretProduct({
      title: "Fritadeira Elétrica Air Fryer Quad Fry Elgin 4,2 L, 1400w",
      brand: "Elgin",
      categoryHint: "casa",
      currentPrice: 179,
      referencePrice: 299,
      hasConfirmedDiscount: true,
      rating: null,
      reviewCount: null,
      isSeasonalEvent: null,
    });
    expect(profile.benefits.some((b) => b.text.includes("40%"))).toBe(true); // real discount (299->179)
    expect(profile.benefits.some((b) => b.text.includes("1400W"))).toBe(true);
    expect(profile.benefits.some((b) => b.text.includes("4,2L"))).toBe(true);
    // every benefit must carry a real, checkable source
    for (const b of profile.benefits) expect(b.source.length).toBeGreaterThan(0);
    expect(profile.benefits.length).toBeLessThanOrEqual(4);
    expect(profile.visualCategory).toBe("casa");
  });

  it("the real Cicaplast Baume B5+ case — picks up real rating as a benefit when present, never invents one when absent", () => {
    const withRating = interpretProduct({
      title: "Creme Multirreparador Pele Sensível Cicaplast Baume B5+ La Roche-Posay 40ml",
      brand: "La Roche-Posay",
      categoryHint: "beleza",
      currentPrice: 71.52,
      referencePrice: 109.9,
      hasConfirmedDiscount: true,
      rating: 4.8,
      reviewCount: 320,
      isSeasonalEvent: null,
    });
    expect(withRating.benefits.some((b) => b.text.includes("4.8/5"))).toBe(true);
    expect(withRating.benefits.some((b) => b.source.includes("Mercado Livre"))).toBe(true);

    const withoutRating = interpretProduct({
      title: "Creme Multirreparador Pele Sensível Cicaplast Baume B5+ La Roche-Posay 40ml",
      brand: "La Roche-Posay",
      categoryHint: "beleza",
      currentPrice: 71.52,
      referencePrice: 109.9,
      hasConfirmedDiscount: true,
      rating: null,
      reviewCount: null,
      isSeasonalEvent: null,
    });
    expect(withoutRating.benefits.some((b) => b.text.includes("/5"))).toBe(false);
  });

  it("the real Kit Halteres case — extracts real weight/kit-size specs, adapts visual direction to 'esportes'", () => {
    const profile = interpretProduct({
      title: "Kit Halteres 6 Em 1 Peso Musculação Até 40kg Ajustável Halter, Kettlebell, Anilha Cor Preto-Vermelho",
      brand: null,
      categoryHint: "esportes",
      currentPrice: 367.53,
      referencePrice: null,
      hasConfirmedDiscount: false,
      rating: null,
      reviewCount: null,
      isSeasonalEvent: null,
    });
    expect(profile.benefits.some((b) => b.text.includes("40kg"))).toBe(true);
    expect(profile.benefits.some((b) => b.text.includes("6 funções"))).toBe(true);
    expect(profile.visualCategory).toBe("esportes");
    expect(profile.priceStrategy).toContain("sem preço anterior"); // no confirmed discount here
  });

  it("never fabricates a benefit when the title has no extractable real spec and there's no rating/discount", () => {
    const profile = interpretProduct({
      title: "Kit Decoração Natalina",
      brand: null,
      categoryHint: "decoracao",
      currentPrice: 78.6,
      referencePrice: null,
      hasConfirmedDiscount: false,
      rating: null,
      reviewCount: null,
      isSeasonalEvent: "Natal",
    });
    expect(profile.benefits).toEqual([]);
    expect(profile.sources[0]).toContain("Nenhum benefício adicional confirmável");
    expect(profile.hierarchy).not.toContain("beneficios"); // nothing to show
  });

  it("caps at exactly 4 benefits even when more are extractable, prioritizing discount and rating first", () => {
    const profile = interpretProduct({
      title: "Produto 1400w 4,2 L 30h 40kg 6 em 1 300g sem sabor",
      brand: null,
      categoryHint: null,
      currentPrice: 50,
      referencePrice: 100,
      hasConfirmedDiscount: true,
      rating: 4.9,
      reviewCount: 10,
      isSeasonalEvent: null,
    });
    expect(profile.benefits.length).toBe(4);
    expect(profile.benefits[0]!.text).toContain("50%"); // discount first
    expect(profile.benefits[1]!.text).toContain("4.9/5"); // rating second
  });
});
