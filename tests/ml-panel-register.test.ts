import { describe, expect, it } from "vitest";
import { extractCatalogProductId } from "@/lib/services/ml-panel-register";

describe("extractCatalogProductId", () => {
  it("picks the product mentioned most often (URL-encoded or plain)", () => {
    const html = `
      <a href="https://www.mercadolivre.com.br/iphone-17/p/MLB1055308605?x=1">a</a>
      iphone-17-pro-max%2Fp%2FMLB1055308605%3Fmatt_ev
      iphone-17%2Fp%2FMLB1055308605%3Fz
      <a href="/outro/p/MLB7668564578">outro</a>`;
    expect(extractCatalogProductId(html)).toBe("MLB1055308605");
  });

  it("returns null when no catalog product is present", () => {
    expect(
      extractCatalogProductId("<html>sem produto MLB-123</html>"),
    ).toBeNull();
  });

  it("reads a product id straight from a product URL", () => {
    expect(
      extractCatalogProductId(
        "https://www.mercadolivre.com.br/tenis-x/p/MLB40123456?a=b",
      ),
    ).toBe("MLB40123456");
  });
});
