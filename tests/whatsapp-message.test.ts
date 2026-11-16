import { describe, expect, it } from "vitest";
import { buildWhatsAppItemCaption } from "@/lib/services/whatsapp-message";
import type { WhatsAppTrendingItem } from "@/lib/queries/whatsapp-trending-today";

const item = (over: Partial<WhatsAppTrendingItem> = {}): WhatsAppTrendingItem => ({
  title: "Fone Bluetooth Exemplo",
  merchant: "MERCADO_LIVRE",
  href: "/produto/fone-bluetooth-exemplo",
  imageUrl: "https://example.com/foto.jpg",
  ...over,
});

describe("buildWhatsAppItemCaption", () => {
  it("never claims a discount when verifiedDrop is absent", () => {
    const text = buildWhatsAppItemCaption(item(), "https://precocaindo.com.br");
    expect(text).not.toMatch(/Caiu|menor preço/i);
    expect(text).toContain("Fone Bluetooth Exemplo");
    expect(text).toContain("https://precocaindo.com.br/produto/fone-bluetooth-exemplo");
  });

  it("shows the real drop percentage when verifiedDrop is set", () => {
    const text = buildWhatsAppItemCaption(
      item({
        verifiedDrop: {
          previousPrice: 200,
          currentPrice: 150,
          dropPercent: 0.25,
          isAllTimeLow: false,
        },
      }),
      "https://precocaindo.com.br",
    );
    expect(text).toContain("Caiu 25%");
    expect(text).toMatch(/200,00/);
    expect(text).toMatch(/150,00/);
  });

  it("claims the all-time-low line only when isAllTimeLow is true", () => {
    const text = buildWhatsAppItemCaption(
      item({
        verifiedDrop: {
          previousPrice: 200,
          currentPrice: 150,
          dropPercent: 0.25,
          isAllTimeLow: true,
        },
      }),
      "https://precocaindo.com.br",
    );
    expect(text).toContain("Nunca esteve tão barato");
    expect(text).not.toContain("Caiu 25%");
  });
});
