import { describe, expect, it } from "vitest";
import { classifyRelevance } from "@/lib/services/shopee-relevance-gate";

describe("classifyRelevance", () => {
  it("marks a real product result as RELEVANT (all/most term words present)", () => {
    const result = classifyRelevance(
      "Samsung Galaxy A17",
      "Smartphone Samsung Galaxy A17 128GB Preto",
    );
    expect(result.status).toBe("RELEVANT");
  });

  it("marks an accessory result as IRRELEVANT — real case found in production diagnosis (capinha for Galaxy A17, not the phone)", () => {
    const result = classifyRelevance(
      "Samsung Galaxy A17",
      "Capa Carteira Flip + Película 3D Para Samsung Galaxy A17 4G/ 5G",
    );
    expect(result.status).toBe("IRRELEVANT");
  });

  it("marks a completely unrelated result as IRRELEVANT (zero word overlap) — real case: 'notebook' returning stickers", () => {
    const result = classifyRelevance("notebook Dell", "Tag Redonda Personalizada Frente e Verso");
    expect(result.status).toBe("IRRELEVANT");
  });

  it("marks a partial-overlap result as UNCERTAIN rather than guessing", () => {
    const result = classifyRelevance("Samsung Galaxy A17", "Cabo USB C para Samsung");
    expect(result.status).toBe("UNCERTAIN");
  });

  it("does not flag a genuine accessory search as IRRELEVANT against itself — searching for an accessory should find accessories", () => {
    const result = classifyRelevance("capinha Galaxy A17", "Capa Silicone Anti Impacto Galaxy A17");
    expect(result.status).not.toBe("IRRELEVANT");
  });

  it("never throws on an empty term or title", () => {
    expect(() => classifyRelevance("", "")).not.toThrow();
    expect(classifyRelevance("", "algo").status).toBe("IRRELEVANT");
  });
});
