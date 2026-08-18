import { describe, expect, it } from "vitest";
import { evaluateContentQuality } from "@/lib/services/content-quality-gate";

const longBody = [
  "## O preço está bom?",
  "O preço atual está abaixo da média dos últimos 30 dias, o que indica um bom momento para compra. ".repeat(3),
  "## Para quem faz sentido",
  "Este produto atende bem quem busca praticidade no dia a dia. ".repeat(3),
  "## Metodologia",
  "O Score PreçoCaindo usa apenas dados coletados diretamente pelo próprio site. ".repeat(3),
].join("\n\n");

describe("evaluateContentQuality — scaled content abuse protections", () => {
  it("fails content nearly identical to an already-published page", () => {
    const result = evaluateContentQuality({
      title: "Produto X — vale a pena?",
      metaTitle: "Produto X — vale a pena comprar agora?",
      metaDescription: "Veja o histórico de preço e se o Produto X está com um preço bom agora mesmo.",
      body: longBody,
      similarityToExistingContent: 0.9,
    });
    expect(result.verdict).toBe("FAIL");
    expect(result.dimensions.duplicationRisk).toBeGreaterThan(80);
  });

  it("flags moderate similarity for review without an automatic fail", () => {
    const result = evaluateContentQuality({
      title: "Produto X — vale a pena?",
      metaTitle: "Produto X — vale a pena comprar agora?",
      metaDescription: "Veja o histórico de preço e se o Produto X está com um preço bom agora mesmo.",
      body: longBody,
      similarityToExistingContent: 0.6,
    });
    expect(result.verdict).toBe("REVIEW");
  });

  it("fails content that implies PreçoCaindo sells the product or processes checkout", () => {
    const result = evaluateContentQuality({
      title: "Produto X — vale a pena?",
      metaTitle: "Produto X — vale a pena comprar agora?",
      metaDescription: "Veja o histórico de preço e se o Produto X está com um preço bom agora mesmo.",
      body: `${longBody}\n\n## Como comprar\n\nBasta adicionar ao carrinho e finalizar a compra aqui mesmo.`,
    });
    expect(result.verdict).toBe("FAIL");
    expect(result.dimensions.commercialTransparency).toBe(0);
  });

  it("scores dataSupport higher when more real facts backed the content", () => {
    const withFacts = evaluateContentQuality({
      title: "Produto X — vale a pena?",
      metaTitle: "Produto X — vale a pena comprar agora?",
      metaDescription: "Veja o histórico de preço e se o Produto X está com um preço bom agora mesmo.",
      body: longBody,
      sourceFactCount: 8,
    });
    const withoutFacts = evaluateContentQuality({
      title: "Produto X — vale a pena?",
      metaTitle: "Produto X — vale a pena comprar agora?",
      metaDescription: "Veja o histórico de preço e se o Produto X está com um preço bom agora mesmo.",
      body: longBody,
      sourceFactCount: 0,
    });
    expect(withFacts.dimensions.dataSupport).toBeGreaterThan(withoutFacts.dimensions.dataSupport);
  });

  it("passes clean, low-similarity, well-supported content", () => {
    const result = evaluateContentQuality({
      title: "Fone Bluetooth XYZ — vale a pena?",
      metaTitle: "Fone Bluetooth XYZ — vale a pena comprar agora?",
      metaDescription:
        "Veja o histórico de preço e se o Fone Bluetooth XYZ está com um preço realmente bom agora.",
      body: longBody,
      similarityToExistingContent: 0.1,
      sourceFactCount: 6,
    });
    expect(result.verdict).toBe("PASS");
    expect(result.dimensions.commercialTransparency).toBe(100);
  });
});
