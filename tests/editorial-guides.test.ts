import { describe, expect, it } from "vitest";
import { getGuideBySlug, GUIDES } from "@/lib/editorial/guides";

describe("editorial guides", () => {
  it("publishes at least the 15-guide Amazon approval readiness set", () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(15);
  });

  it("has unique slugs and complete metadata", () => {
    expect(new Set(GUIDES.map((guide) => guide.slug)).size).toBe(GUIDES.length);
    for (const guide of GUIDES) {
      expect(guide.title.length).toBeGreaterThan(20);
      expect(guide.description.length).toBeGreaterThan(60);
      expect(guide.author).toBe("Equipe PreçoCaindo");
      expect(guide.seo.title).toBeTruthy();
      expect(guide.seo.description.length).toBeGreaterThan(60);
      expect(guide.sections.length).toBeGreaterThanOrEqual(3);
      expect(Date.parse(guide.publishedAt)).not.toBeNaN();
      expect(Date.parse(guide.updatedAt)).not.toBeNaN();
    }
  });

  it("includes the required editorial themes from the approval sprint", () => {
    const requiredSlugs = [
      "como-saber-se-uma-promocao-e-realmente-boa",
      "como-comparar-precos-sem-cair-em-falso-desconto",
      "como-comparar-preco-por-kg-litro-ou-unidade",
      "menor-preco-historico-o-que-isso-realmente-significa",
      "como-saber-se-vale-a-pena-comprar-agora",
      "como-funciona-o-historico-de-precos",
      "parcelado-ou-a-vista-como-comparar-corretamente",
      "quando-vale-a-pena-esperar-a-black-friday",
      "como-comparar-embalagens-de-tamanhos-diferentes",
      "como-escolher-uma-air-fryer-sem-olhar-apenas-o-preco",
      "como-comparar-celulares-alem-do-preco",
      "como-escolher-um-robo-aspirador-pelo-custo-beneficio",
      "como-comparar-televisores-antes-de-comprar",
      "como-economizar-em-compras-recorrentes",
      "como-o-score-precocaindo-ajuda-a-avaliar-uma-oportunidade",
    ];

    for (const slug of requiredSlugs) {
      expect(getGuideBySlug(slug)?.slug).toBe(slug);
    }
  });

  it("integrates the required public tools into contextual guides", () => {
    expect(
      getGuideBySlug("como-comparar-preco-por-kg-litro-ou-unidade")?.tool,
    ).toBe("unit-comparison");
    expect(
      getGuideBySlug("parcelado-ou-a-vista-como-comparar-corretamente")?.tool,
    ).toBe("installment-comparison");
    expect(
      getGuideBySlug("como-comparar-precos-sem-cair-em-falso-desconto")?.tool,
    ).toBe("real-discount");
  });

  it("only links to related guides that exist", () => {
    for (const guide of GUIDES) {
      for (const slug of guide.relatedSlugs) {
        expect(getGuideBySlug(slug)?.slug).toBe(slug);
      }
    }
  });
});
