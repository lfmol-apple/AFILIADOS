import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Owner's authorization, 2026-11-22 ("Frente B — Pixel Meta do
 * Henrique", B7: "os content_ids dos eventos precisam corresponder
 * exatamente aos IDs do catálogo"). Confirmed by reading
 * app/catalogo/mercado-livre.xml/route.ts directly: `g:id` is
 * `selection.merchantListingId` — the VitrineSelection row's own
 * merchantListingId, which is the same real MerchantListing.id
 * lib/queries/public-product.ts's loadPublicMerchantProduct() returns as
 * `merchantListingId` on its view model. This is a regression guard
 * (same idiom as tests/one-shot-ad-generator.test.ts's "regression
 * guard" describe block) — it fails loudly if either side is ever
 * changed to use a different field (e.g. accidentally switching to the
 * Mercado Livre externalId, which the catalog never uses as `g:id`).
 */
describe("regression guard — Meta catalog g:id and Pixel content_ids must use the same field", () => {
  it("app/catalogo/mercado-livre.xml/route.ts publishes g:id from merchantListingId, not externalId", () => {
    const source = readFileSync(new URL("../app/catalogo/mercado-livre.xml/route.ts", import.meta.url), "utf8");
    expect(source).toMatch(/<g:id>\$\{escapeXml\(selection\.merchantListingId\)\}<\/g:id>/);
  });

  it("lib/analytics/meta-pixel-client.ts sends content_ids from merchantListingId — the same field name", () => {
    const source = readFileSync(new URL("../lib/analytics/meta-pixel-client.ts", import.meta.url), "utf8");
    expect(source).toMatch(/content_ids:\s*\[product\.merchantListingId\]/);
  });
});
