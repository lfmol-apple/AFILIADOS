import { describe, expect, it } from "vitest";
import { priceEvidenceLine } from "@/lib/services/price-evidence";

describe("priceEvidenceLine", () => {
  it("says below average when the price is meaningfully under avg30d", () => {
    expect(priceEvidenceLine(179.9, 230.91)).toBe("Abaixo da média de 30 dias");
  });

  it("says above average when the price is meaningfully over avg30d", () => {
    expect(priceEvidenceLine(250, 200)).toBe("Acima da média de 30 dias");
  });

  it("returns null when there is no average yet", () => {
    expect(priceEvidenceLine(179.9, null)).toBeNull();
  });

  it("returns null when the price is essentially at the average (no real signal)", () => {
    expect(priceEvidenceLine(100.3, 100)).toBeNull();
  });

  it("never divides by zero for a zero/negative average", () => {
    expect(priceEvidenceLine(50, 0)).toBeNull();
  });
});
