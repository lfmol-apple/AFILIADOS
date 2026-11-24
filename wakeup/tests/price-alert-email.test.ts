import { describe, expect, it } from "vitest";
import {
  buildConfirmationEmail,
  buildTriggeredEmail,
} from "@/lib/services/price-alert-email";

describe("buildConfirmationEmail", () => {
  it("includes the confirm link and the real target price, never a rounded one", () => {
    const email = buildConfirmationEmail({
      productTitle: "Fralda Descartável Pacote Grande",
      targetPrice: 49.9,
      confirmUrl: "https://precocaindo.com.br/api/price-alerts/confirm/abc123",
    });
    expect(email.text).toContain(
      "https://precocaindo.com.br/api/price-alerts/confirm/abc123",
    );
    expect(email.html).toContain(
      "https://precocaindo.com.br/api/price-alerts/confirm/abc123",
    );
    expect(email.text).toContain("R$");
    expect(email.subject).toContain("Fralda Descartável Pacote Grande");
  });

  it("escapes HTML in the product title to prevent injection into the email body", () => {
    const email = buildConfirmationEmail({
      productTitle: '<script>alert("x")</script>',
      targetPrice: 10,
      confirmUrl: "https://example.com/confirm/x",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("buildTriggeredEmail", () => {
  it("states the real current price and links straight to the product", () => {
    const email = buildTriggeredEmail({
      productTitle: "Fralda Descartável Pacote Grande",
      targetPrice: 50,
      currentPrice: 45.5,
      productUrl: "https://precocaindo.com.br/go/shopee/ext-1",
    });
    expect(email.text).toContain("https://precocaindo.com.br/go/shopee/ext-1");
    expect(email.subject).toContain("Fralda Descartável Pacote Grande");
    expect(email.text).toContain("45,50");
  });
});
