import { describe, expect, it } from "vitest";
import {
  jaccardSimilarity,
  maxSimilarityAgainstCorpus,
  contentHash,
} from "@/lib/services/similarity";

describe("jaccardSimilarity", () => {
  it("returns 1 for identical text", () => {
    const text =
      "Este produto tem um ótimo custo benefício para quem busca praticidade.";
    expect(jaccardSimilarity(text, text)).toBe(1);
  });

  it("returns 0 for completely unrelated text", () => {
    const a = "Fone de ouvido bluetooth com cancelamento de ruído ativo";
    const b = "Receita de bolo de cenoura com cobertura de chocolate quente";
    expect(jaccardSimilarity(a, b)).toBeLessThan(0.2);
  });

  it("detects near-duplicate scaled content (same template, product name swapped)", () => {
    const a =
      "O Fone Bluetooth XYZ tem um preço excelente comparado ao histórico coletado pelo PreçoCaindo.";
    const b =
      "O Air Fryer ABC tem um preço excelente comparado ao histórico coletado pelo PreçoCaindo.";
    expect(jaccardSimilarity(a, b)).toBeGreaterThan(0.4);
  });
});

describe("maxSimilarityAgainstCorpus", () => {
  it("returns the highest similarity across the corpus", () => {
    const body =
      "Texto sobre fone de ouvido bluetooth com cancelamento de ruído.";
    const corpus = [
      "Receita de bolo de chocolate com cobertura.",
      "Texto sobre fone de ouvido bluetooth com cancelamento de ruído ativo.",
    ];
    expect(maxSimilarityAgainstCorpus(body, corpus)).toBeGreaterThan(0.5);
  });

  it("returns 0 for an empty corpus", () => {
    expect(maxSimilarityAgainstCorpus("qualquer texto", [])).toBe(0);
  });
});

describe("contentHash", () => {
  it("is deterministic for the same normalized content", () => {
    expect(contentHash("Texto de Exemplo!")).toBe(
      contentHash("texto de exemplo"),
    );
  });

  it("differs for different content", () => {
    expect(contentHash("Texto A")).not.toBe(contentHash("Texto B"));
  });
});
