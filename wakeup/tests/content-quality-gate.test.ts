import { describe, expect, it } from "vitest";
import { evaluateContentQuality } from "@/lib/services/content-quality-gate";

const longBody = [
  "## O preço está bom?",
  "O preço atual está abaixo da média dos últimos 30 dias, o que indica um bom momento para compra. ".repeat(
    3,
  ),
  "## Para quem faz sentido",
  "Este produto atende bem quem busca praticidade no dia a dia. ".repeat(3),
  "## Metodologia",
  "O Score PreçoCaindo usa apenas dados coletados diretamente pelo próprio site. ".repeat(
    3,
  ),
].join("\n\n");

describe("evaluateContentQuality", () => {
  it("passes well-structured, sufficiently long, original content", () => {
    const result = evaluateContentQuality({
      title: "Fone Bluetooth XYZ — vale a pena?",
      metaTitle: "Fone Bluetooth XYZ — vale a pena comprar agora?",
      metaDescription:
        "Veja o histórico de preço e se o Fone Bluetooth XYZ está com um preço realmente bom agora.",
      body: longBody,
    });
    expect(result.verdict).toBe("PASS");
  });

  it("fails content that is too short", () => {
    const result = evaluateContentQuality({
      title: "Produto",
      metaTitle: "Produto na Amazon — confira o preço",
      metaDescription:
        "Descrição curta para o produto disponível na Amazon agora mesmo por aqui.",
      body: "Preço bom.",
    });
    expect(result.verdict).toBe("FAIL");
    expect(result.reasons.some((r) => r.includes("curto"))).toBe(true);
  });

  it("fails content that merely restates the marketplace description (duplication)", () => {
    const description =
      "Fone de ouvido bluetooth com cancelamento de ruído e 30 horas de bateria.";
    const result = evaluateContentQuality({
      title: "Fone Bluetooth",
      metaTitle: "Fone Bluetooth — confira o preço agora mesmo",
      metaDescription:
        "Confira o preço atual do Fone Bluetooth e o histórico de preços no PreçoCaindo.",
      body: description,
      sourceDescriptionLength: description.length,
    });
    expect(result.verdict).toBe("FAIL");
  });

  it("flags a missing title as a hard failure", () => {
    const result = evaluateContentQuality({
      title: "",
      metaTitle: "Meta título válido para o produto",
      metaDescription:
        "Meta description dentro da faixa recomendada de cinquenta a cento e sessenta caracteres aqui.",
      body: longBody,
    });
    expect(result.verdict).toBe("FAIL");
  });

  it("returns REVIEW for content with only soft issues", () => {
    const result = evaluateContentQuality({
      title: "Fone Bluetooth XYZ — vale a pena?",
      metaTitle:
        "Fone Bluetooth XYZ — vale a pena comprar agora? Confira agora o preço completo",
      metaDescription: "curta",
      body: longBody,
    });
    expect(result.verdict).toBe("REVIEW");
  });
});
