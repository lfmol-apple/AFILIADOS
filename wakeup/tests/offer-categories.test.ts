import { describe, expect, it } from "vitest";
import {
  OFFER_CATEGORIES,
  classifyOffer,
  isOfferCategorySlug,
  offerCategoryLabel,
} from "@/lib/offers/categories";

describe("classifyOffer", () => {
  it("uses the Mercado Livre domainId when it is mapped, regardless of the title", () => {
    expect(
      classifyOffer({ title: "qualquer coisa", mlDomainId: "MLB-CELLPHONES" }),
    ).toBe("celulares");
    expect(
      classifyOffer({ title: "x", mlDomainId: "MLB-CAT_AND_DOG_FOODS" }),
    ).toBe("pet");
    expect(
      classifyOffer({ title: "x", mlDomainId: "MLB-DISPOSABLE_BABY_DIAPERS" }),
    ).toBe("bebe");
    expect(
      classifyOffer({ title: "x", mlDomainId: "MLB-3D_PRINTER_FILAMENTS" }),
    ).toBe("informatica");
  });

  it("falls back to title keywords when the domain is unknown or missing", () => {
    expect(
      classifyOffer({
        title: "Kit 3 Lâmpadas Led 9W",
        mlDomainId: "MLB-NOT_A_REAL_DOMAIN",
      }),
    ).toBe("ferramentas");
    expect(classifyOffer({ title: "Antipulgas Simparic Trio 72mg Cães" })).toBe(
      "pet",
    );
    expect(classifyOffer({ title: "Fone de Ouvido Bluetooth Sem Fio" })).toBe(
      "audio-games",
    );
    expect(classifyOffer({ title: "Tênis de Corrida Masculino" })).toBe("moda");
    expect(classifyOffer({ title: "Creatina Monohidratada 300g" })).toBe(
      "esporte-suplementos",
    );
    expect(classifyOffer({ title: "Sabão Líquido Omo Lavagem Perfeita" })).toBe(
      "limpeza",
    );
  });

  it("is accent and case insensitive", () => {
    expect(classifyOffer({ title: "RAÇÃO PARA CÃES ADULTOS" })).toBe("pet");
    expect(classifyOffer({ title: "Jogo de Lençol 400 Fios" })).toBe("casa");
  });

  it("puts specific groups before generic ones (baby wipes are baby, not cleaning)", () => {
    expect(classifyOffer({ title: "Toalha Umedecida Baby 100 unidades" })).toBe(
      "bebe",
    );
  });

  it("returns 'outros' instead of guessing when nothing matches", () => {
    expect(classifyOffer({ title: "Objeto misterioso XYZ" })).toBe("outros");
  });
});

describe("category taxonomy", () => {
  it("has unique slugs, ends with 'outros', and validates slugs", () => {
    const slugs = OFFER_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs[slugs.length - 1]).toBe("outros");
    expect(isOfferCategorySlug("pet")).toBe(true);
    expect(isOfferCategorySlug("amazon")).toBe(false);
    expect(offerCategoryLabel("pet")).toBe("Pet");
    expect(offerCategoryLabel("does-not-exist")).toBe("Outros");
  });
});
