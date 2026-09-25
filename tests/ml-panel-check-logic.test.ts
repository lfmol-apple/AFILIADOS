import { describe, expect, it } from "vitest";
import {
  carriesOwnerProfile,
  decideVerdict,
  expectedIdsFromProductUrl,
  pageTitleFromHtml,
  titleSimilarity,
} from "@/lib/services/ml-panel-check-logic";

describe("expectedIdsFromProductUrl", () => {
  it("reads the catalog id and the listing id from a panel card address", () => {
    expect(
      expectedIdsFromProductUrl(
        "https://www.mercadolivre.com.br/sofa-retratil/p/MLB24138857?pdp_filters=item_id%3AMLB6428436198",
      ),
    ).toEqual({ catalogId: "MLB24138857", itemId: "MLB6428436198" });
  });

  it("has no catalog id for user-product or item-page addresses", () => {
    expect(
      expectedIdsFromProductUrl(
        "https://www.mercadolivre.com.br/panela/up/MLBU3892648456?pdp_filters=item_id%3AMLB4590121239",
      ).catalogId,
    ).toBeNull();
    expect(
      expectedIdsFromProductUrl(
        "https://produto.mercadolivre.com.br/MLB-4002919471-capa-_JM",
      ),
    ).toEqual({ catalogId: null, itemId: null });
    expect(expectedIdsFromProductUrl(undefined)).toEqual({
      catalogId: null,
      itemId: null,
    });
  });
});

describe("pageTitleFromHtml", () => {
  it("prefers og:title and strips the Mercado Livre suffix and entities", () => {
    expect(
      pageTitleFromHtml(
        '<html><head><meta property="og:title" content="Sofá Retrátil 3,00m &amp; Molas | Mercado Livre"><title>x</title></head>',
      ),
    ).toBe("Sofá Retrátil 3,00m & Molas");
  });

  it("falls back to <title> and returns null when there is none", () => {
    expect(
      pageTitleFromHtml("<title>Cadeira Gamer - Mercado Livre</title>"),
    ).toBe("Cadeira Gamer");
    expect(pageTitleFromHtml("<html></html>")).toBeNull();
  });
});

describe("titleSimilarity", () => {
  it("is high for the same product and low for a different one", () => {
    const panel =
      "Sofá Retrátil E Reclinável Com Molas 1,80m Vegas Suede Cinza";
    expect(
      titleSimilarity(panel, "Sofá Retrátil Reclinável Com Molas 1,80m Vegas"),
    ).toBeGreaterThanOrEqual(0.6);
    expect(
      titleSimilarity(panel, "Kit 10 Potes Herméticos Vidro 640ml Marmita"),
    ).toBeLessThanOrEqual(0.2);
  });
});

describe("decideVerdict", () => {
  it("match only when the catalog ids are equal", () => {
    expect(
      decideVerdict({
        expectedCatalogId: "MLB1",
        resolvedCatalogId: "MLB1",
        similarity: 0,
      }),
    ).toBe("match");
  });

  it("different catalog ids: mismatch unless the title still says it is the same product", () => {
    expect(
      decideVerdict({
        expectedCatalogId: "MLB1",
        resolvedCatalogId: "MLB2",
        similarity: 0.1,
      }),
    ).toBe("mismatch");
    expect(
      decideVerdict({
        expectedCatalogId: "MLB1",
        resolvedCatalogId: "MLB2",
        similarity: 0.8,
      }),
    ).toBe("likely");
  });

  it("without comparable ids it judges by title, and is 'unknown' when the title is unreadable or in between", () => {
    const base = { expectedCatalogId: null, resolvedCatalogId: null };
    expect(decideVerdict({ ...base, similarity: 0.9 })).toBe("likely");
    expect(decideVerdict({ ...base, similarity: 0.1 })).toBe("mismatch");
    expect(decideVerdict({ ...base, similarity: 0.4 })).toBe("unknown");
    expect(decideVerdict({ ...base, similarity: null })).toBe("unknown");
  });
});

describe("carriesOwnerProfile", () => {
  it("recognises the owner's affiliate tag and profile in the opened link", () => {
    expect(
      carriesOwnerProfile(
        "https://www.mercadolivre.com.br/social/mohe4109227?matt_word=precocaindo&matt_tool=85497435&ref=abc",
      ),
    ).toBe(true);
    expect(
      carriesOwnerProfile("https://www.mercadolivre.com.br/p/MLB1?foo=bar"),
    ).toBe(false);
  });
});
