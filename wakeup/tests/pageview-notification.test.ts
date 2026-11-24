import { describe, expect, it } from "vitest";
import { describePageviewForOwner } from "@/lib/analytics/pageview-notification";

describe("describePageviewForOwner", () => {
  it("home", () => {
    expect(describePageviewForOwner("home", "/")).toEqual({
      label: "Página inicial",
      url: "/",
    });
  });

  it("product: links straight to the product page", () => {
    expect(describePageviewForOwner("product", "fone-bluetooth-xyz")).toEqual({
      label: "Produto: fone-bluetooth-xyz",
      url: "/produto/fone-bluetooth-xyz",
    });
  });

  it("category", () => {
    expect(describePageviewForOwner("category", "casa")).toEqual({
      label: "Categoria: casa",
      url: "/categorias/casa",
    });
  });

  it("guide and guides list", () => {
    expect(describePageviewForOwner("guide", "melhor-air-fryer")).toEqual({
      label: "Guia: melhor-air-fryer",
      url: "/guias/melhor-air-fryer",
    });
    expect(describePageviewForOwner("guides", "guias")).toEqual({
      label: "Lista de guias",
      url: "/guias",
    });
  });

  it("achados", () => {
    expect(describePageviewForOwner("achados", "achados")).toEqual({
      label: "Achados",
      url: "/achados",
    });
  });

  it("ofertas: plain, by category and by search — each with the right link", () => {
    expect(describePageviewForOwner("ofertas", "ofertas")).toEqual({
      label: "Ofertas",
      url: "/ofertas",
    });
    expect(describePageviewForOwner("ofertas", "ofertas:pet")).toEqual({
      label: "Ofertas: pet",
      url: "/ofertas?categoria=pet",
    });
    expect(describePageviewForOwner("ofertas", "busca:ar condicionado")).toEqual({
      label: 'Busca: "ar condicionado"',
      url: "/ofertas?q=ar%20condicionado",
    });
  });

  it("an unknown pageType degrades to a generic label and the site root, never a broken link", () => {
    expect(describePageviewForOwner("something-new", "whatever")).toEqual({
      label: "something-new",
      url: "/",
    });
  });
});
