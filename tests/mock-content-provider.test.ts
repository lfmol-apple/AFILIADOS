import { describe, expect, it } from "vitest";
import { MockContentProvider } from "@/lib/content/mock-content-provider";
import { evaluateContentQuality } from "@/lib/services/content-quality-gate";
import type { ProductFacts } from "@/types/content";

const facts: ProductFacts = {
  title: "Fone de Ouvido Bluetooth com Cancelamento de Ruído",
  brand: "SoundPeak",
  categoryName: "Eletrônicos",
  description:
    "Fone over-ear sem fio com cancelamento ativo de ruído, até 30 horas de bateria e microfone para chamadas.",
  specifications: {
    Tipo: "Over-ear",
    Conectividade: "Bluetooth 5.3",
    "Autonomia da bateria": "30 horas",
  },
  rating: 4.6,
  reviewCount: 3821,
  currentPrice: 349.9,
  currency: "BRL",
  discountPercentage: 30,
  lowestPrice: 329.9,
  highestPrice: 499.9,
  avg30d: 420,
  coverageDays: 45,
  opportunityScore: 88,
  opportunityLabel: "Bom momento para comprar",
};

describe("MockContentProvider", () => {
  it("never mentions a fact that was not provided", async () => {
    const provider = new MockContentProvider();
    const result = await provider.generate({
      contentType: "PRODUCT",
      promptVersion: "product-review-v1",
      slug: "fone-bluetooth",
      facts: { ...facts, rating: undefined, reviewCount: undefined },
    });
    expect(result.body).not.toMatch(/4[.,]6/);
    expect(result.body).toMatch(/avaliações suficientes/);
  });

  it("produces content that passes the quality gate", async () => {
    const provider = new MockContentProvider();
    const result = await provider.generate({
      contentType: "PRODUCT",
      promptVersion: "product-review-v1",
      slug: "fone-bluetooth",
      facts,
    });
    const quality = evaluateContentQuality({
      title: result.title,
      metaTitle: result.metaTitle,
      metaDescription: result.metaDescription,
      body: result.body,
      sourceDescriptionLength: facts.description?.length,
    });
    expect(quality.verdict).not.toBe("FAIL");
  });

  it("states short coverage explicitly instead of implying a long track record", async () => {
    const provider = new MockContentProvider();
    const result = await provider.generate({
      contentType: "PRODUCT",
      promptVersion: "product-review-v1",
      slug: "fone-bluetooth",
      facts: { ...facts, coverageDays: 4 },
    });
    expect(result.body).toMatch(/4 dia\(s\)/);
  });
});
