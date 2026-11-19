import { describe, expect, it } from "vitest";
import { evaluateAdPotentialHypothesis } from "@/lib/services/commercial-intelligence/ad-potential-hypothesis";

describe("evaluateAdPotentialHypothesis — owner's authorization, 2026-11-19", () => {
  it("classifies a cheap product as high impulse fit, with reasoning", () => {
    const r = evaluateAdPotentialHypothesis({ title: "Guirlanda Natal", currentPrice: 45, hasConfirmedPriceDrop: false });
    expect(r.impulseFit).toBe("alto");
    expect(r.impulseFitReason).toContain("45");
    expect(r.note).toContain("Hipótese");
  });

  it("classifies an expensive product as low impulse fit", () => {
    const r = evaluateAdPotentialHypothesis({ title: "Smartphone", currentPrice: 1800, hasConfirmedPriceDrop: false });
    expect(r.impulseFit).toBe("baixo");
  });

  it("never fabricates a price band when price is unknown", () => {
    const r = evaluateAdPotentialHypothesis({ title: "Produto", currentPrice: null, hasConfirmedPriceDrop: false });
    expect(r.impulseFit).toBe("indeterminado");
  });

  it("flags a long, keyword-stuffed title as poluida", () => {
    const longTitle =
      "Kit 10 Potes Herméticos Vidro 640ml Starhouse Marmita Forno Micro-ondas Airfryer com 4 travas de super vedação Premium";
    const r = evaluateAdPotentialHypothesis({ title: longTitle, currentPrice: 50, hasConfirmedPriceDrop: false });
    expect(r.offerClarity).toBe("poluida");
  });

  it("flags a short, clear title as clara", () => {
    const r = evaluateAdPotentialHypothesis({ title: "Fone de Ouvido Bluetooth", currentPrice: 50, hasConfirmedPriceDrop: false });
    expect(r.offerClarity).toBe("clara");
  });

  it("passes through a real confirmed discount, never invents one", () => {
    const withDrop = evaluateAdPotentialHypothesis({ title: "Produto", currentPrice: 50, hasConfirmedPriceDrop: true });
    expect(withDrop.hasVisibleDiscountHook).toBe(true);
    const without = evaluateAdPotentialHypothesis({ title: "Produto", currentPrice: 50, hasConfirmedPriceDrop: false });
    expect(without.hasVisibleDiscountHook).toBe(false);
  });
});
