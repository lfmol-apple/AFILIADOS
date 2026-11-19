import { describe, expect, it } from "vitest";
import { buildCreativePrompt } from "@/lib/services/ai-creative-factory/prompt-builder";

const BASE = {
  title: "Creme Hidratante Facial 3 Ceramidas CeraVe 50g",
  brand: "CeraVe",
  categoryHint: null,
  currentPrice: 49.9,
  referencePrice: null,
  hasConfirmedDiscount: false,
  rating: null,
  soldQuantityLabel: null,
  impulseFit: "alto" as const,
  isSeasonalEvent: null,
};

describe("buildCreativePrompt — owner's authorization, 2026-11-19", () => {
  it("always forbids price/text/CTA/logo in the AI prompt (those belong to the programmatic layer)", () => {
    const prompt = buildCreativePrompt(BASE);
    expect(prompt).toContain("NÃO inclua texto, preço, números, logotipos");
  });

  it("always demands exact preservation of the real product", () => {
    const prompt = buildCreativePrompt(BASE);
    expect(prompt).toContain("preserve exatamente a embalagem, cor, marca, modelo");
  });

  it("picks a category-specific direction when a real category hint is given", () => {
    const prompt = buildCreativePrompt({ ...BASE, categoryHint: "Beleza e Cuidado Pessoal" });
    expect(prompt).toContain("sofisticado");
  });

  it("falls back to a neutral direction for an unrecognized category — never guesses a theme", () => {
    const prompt = buildCreativePrompt({ ...BASE, categoryHint: "Categoria Totalmente Desconhecida XYZ" });
    expect(prompt).toContain("composição profissional e limpa");
  });

  it("prioritizes a real matched seasonal event over the category direction", () => {
    const prompt = buildCreativePrompt({ ...BASE, categoryHint: "Beleza", isSeasonalEvent: "Natal" });
    expect(prompt).toContain("natalina");
  });

  it("never fabricates a rating or sold-quantity line when those are null", () => {
    const prompt = buildCreativePrompt(BASE);
    expect(prompt).not.toContain("Avaliação real");
    expect(prompt).not.toContain("Popularidade real");
  });

  it("includes a real rating/sold-quantity line only when provided", () => {
    const prompt = buildCreativePrompt({ ...BASE, rating: 4.8, soldQuantityLabel: "+1000 vendidos" });
    expect(prompt).toContain("4.8/5");
    expect(prompt).toContain("+1000 vendidos");
  });
});
