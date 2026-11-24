import { describe, expect, it } from "vitest";
import { buildWhatsAppItemCaption } from "@/lib/services/whatsapp-message";
import type { WhatsAppTrendingItem } from "@/lib/queries/whatsapp-trending-today";

const item = (price: WhatsAppTrendingItem["price"]): WhatsAppTrendingItem => ({
  title: "Fone Bluetooth Exemplo",
  merchant: "MERCADO_LIVRE",
  imageUrl: "https://example.com/foto.jpg",
  affiliateUrl: "https://mercadolivre.com/afiliado/abc123",
  price,
});

describe("buildWhatsAppItemCaption", () => {
  it("price_only: shows only the current price, never a fabricated 'before' price or discount claim", () => {
    const text = buildWhatsAppItemCaption(item({ kind: "price_only", currentPrice: 99.9 }));
    expect(text).toContain("Fone Bluetooth Exemplo");
    expect(text).toMatch(/\*R\$\s*99,90\*/);
    expect(text).not.toMatch(/~/); // no strikethrough — no "before" price exists
    expect(text).not.toMatch(/Caiu|OFF|Economia/i);
    expect(text).toContain("https://mercadolivre.com/afiliado/abc123");
    expect(text).toMatch(/Preço pode ser variável/);
  });

  it("verified_drop: strikes the previous price, claims a real drop comprovado pelo histórico", () => {
    const text = buildWhatsAppItemCaption(
      item({ kind: "verified_drop", currentPrice: 150, previousPrice: 200, dropPercent: 0.25, isAllTimeLow: false }),
    );
    expect(text).toMatch(/~R\$\s*200,00~/);
    expect(text).toMatch(/\*R\$\s*150,00\*/);
    expect(text).toContain("Caiu 25%");
    expect(text).toMatch(/comprovada pelo histórico do PreçoCaindo/);
    expect(text).toMatch(/Economia de R\$\s*50,00/);
  });

  it("verified_drop + isAllTimeLow: claims the all-time-low line instead of a percentage", () => {
    const text = buildWhatsAppItemCaption(
      item({ kind: "verified_drop", currentPrice: 150, previousPrice: 200, dropPercent: 0.25, isAllTimeLow: true }),
    );
    expect(text).toContain("Nunca esteve tão barato");
    expect(text).not.toContain("Caiu 25%");
  });

  it("store_discount: presents the store's own discount, never as something PreçoCaindo verified", () => {
    const text = buildWhatsAppItemCaption(
      item({ kind: "store_discount", currentPrice: 150, originalPrice: 200, discountPercent: 0.25 }),
    );
    expect(text).toMatch(/~R\$\s*200,00~/);
    expect(text).toMatch(/\*R\$\s*150,00\*/);
    expect(text).toContain("25% OFF");
    expect(text).toMatch(/desconto anunciado pela loja/);
    expect(text).not.toMatch(/comprovado|histórico do PreçoCaindo/);
    expect(text).toMatch(/Economia de R\$\s*50,00/);
  });

  it("always links directly to the real merchant affiliate URL, never a precocaindo.com.br link", () => {
    const text = buildWhatsAppItemCaption(item({ kind: "price_only", currentPrice: 10 }));
    expect(text).not.toContain("precocaindo.com.br");
    expect(text).toContain("mercadolivre.com/afiliado");
  });
});
