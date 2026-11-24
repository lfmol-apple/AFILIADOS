import { describe, expect, it } from "vitest";
import { evaluateDescriptionQuality } from "@/lib/services/commercial-intelligence/description-quality";

describe("evaluateDescriptionQuality — owner's finding, 2026-11-20 (Auditoria Contínua, section 1/4)", () => {
  it("flags the real Spanish-leaning title found live as inadequada", () => {
    const result = evaluateDescriptionQuality("Taza Termica Portácil De 32oz /color Vaca Lechera");
    expect(result.quality).toBe("inadequada");
    expect(result.language).toBe("es");
  });

  it("flags the real all-English title found live as inadequada", () => {
    const result = evaluateDescriptionQuality("Warm Snow Boots And Cotton Shoes For Women 2026 A Khaki 36 Eu");
    expect(result.quality).toBe("inadequada");
    expect(result.language).toBe("en");
  });

  it("never flags a normal pt-BR title, even one using words that collide with Spanish before diacritic-stripping (anos/mas/aqui/está/vaca)", () => {
    const result = evaluateDescriptionQuality(
      "Esta vaca de pelúcia está aqui há 2 anos, mas ainda é um dos mais vendidos",
    );
    expect(result.quality).toBe("adequada");
  });

  it("requires at least 2 distinct strong markers — a single borrowed/ambiguous word never flags on its own", () => {
    const result = evaluateDescriptionQuality("Caneca Térmica 32oz Cor Vaca Holandesa");
    expect(result.quality).toBe("adequada");
  });

  it("a real Brazilian title with a single English product-line word (e.g. 'Air Fryer') is not flagged", () => {
    const result = evaluateDescriptionQuality("Fritadeira Elétrica Air Fryer Quad Fry Elgin 4,2 L, 1400w");
    expect(result.quality).toBe("adequada");
  });
});
