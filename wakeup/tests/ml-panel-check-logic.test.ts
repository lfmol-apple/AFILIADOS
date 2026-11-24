import { describe, expect, it } from "vitest";
import {
  carriesOwnerProfile,
  decideVerdict,
  expectedIdsFromProductUrl,
  matchOpenedLinkToPick,
  pageTitleFromHtml,
  parseBatchLinks,
  titleJaccard,
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

describe("matchOpenedLinkToPick", () => {
  const picks = [
    {
      id: "Kit 2 Câmeras Segurança Ip Interna Externa Wifi iCSee",
      title: "Kit 2 Câmeras Segurança Ip Interna Externa Wifi iCSee",
      productUrl:
        "https://www.mercadolivre.com.br/kit-2-cameras/p/MLB46836439?pdp_filters=item_id%3AMLB5735296442",
    },
    {
      id: "Varal De Chão Grande De Roupas 3 Andares Dobrável Azul Kontuz",
      title: "Varal De Chão Grande De Roupas 3 Andares Dobrável Azul Kontuz",
      productUrl:
        "https://www.mercadolivre.com.br/varal/p/MLB26417959?pdp_filters=item_id%3AMLB3421967823",
    },
  ];

  it("pairs by catalog id regardless of the order of the links", () => {
    expect(
      matchOpenedLinkToPick({ catalogId: "MLB26417959", title: null }, picks),
    ).toEqual({ pickId: picks[1]!.id, how: "id" });
    expect(
      matchOpenedLinkToPick({ catalogId: "MLB46836439", title: null }, picks),
    ).toEqual({ pickId: picks[0]!.id, how: "id" });
  });

  it("falls back to the title (>= 0.7) and gives up when nothing fits", () => {
    expect(
      matchOpenedLinkToPick(
        {
          catalogId: "MLB999999999",
          title:
            "Varal De Chão Grande De Roupas 3 Andares Dobrável Azul Kontuz 170 cm",
        },
        picks,
      ),
    ).toEqual({ pickId: picks[1]!.id, how: "title" });
    expect(
      matchOpenedLinkToPick(
        { catalogId: "MLB999999999", title: "Panela de Pressão Elétrica 6L" },
        picks,
      ),
    ).toEqual({ pickId: null, how: null });
  });
});

describe("parseBatchLinks", () => {
  it("keeps unique http(s) links in order and ignores everything else", () => {
    const text =
      "https://meli.la/2Njpcf4\nhttps://meli.la/2fy6rhK  https://meli.la/2Njpcf4\nlixo sem link\n(https://meli.la/2ntQHuZ),";
    expect(parseBatchLinks(text)).toEqual([
      "https://meli.la/2Njpcf4",
      "https://meli.la/2fy6rhK",
      "https://meli.la/2ntQHuZ",
    ]);
    expect(parseBatchLinks("")).toEqual([]);
  });
});

describe("titleJaccard / exact title", () => {
  it("is ~1 for the same title and low for a different product", () => {
    expect(
      titleJaccard(
        "4 Travesseiros Antialérgico Impermeável 50x70 Super Macio Branco",
        "4 Travesseiros Antialérgico Impermeável 50x70 Super Macio Branco",
      ),
    ).toBe(1);
    expect(
      titleJaccard(
        "Kit 10 Potes Herméticos Vidro 640ml Starhouse",
        "Kit 10 Potes Herméticos Vidro 370ml Starhouse",
      ),
    ).toBeLessThan(0.9);
  });

  it("decideVerdict: identical title counts as a match only when ids can't be compared", () => {
    const base = { expectedCatalogId: null, resolvedCatalogId: null };
    expect(decideVerdict({ ...base, similarity: 1, exactTitle: true })).toBe(
      "match",
    );
    expect(decideVerdict({ ...base, similarity: 1 })).toBe("likely");
    expect(
      decideVerdict({
        expectedCatalogId: "MLB1",
        resolvedCatalogId: "MLB2",
        similarity: 1,
        exactTitle: true,
      }),
    ).toBe("likely");
  });

  it("matchOpenedLinkToPick marks an identical title as title-exact, a rough one as title", () => {
    const picks = [
      {
        id: "a",
        title: "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo",
      },
    ];
    expect(
      matchOpenedLinkToPick(
        {
          catalogId: null,
          title: "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo",
        },
        picks,
      ),
    ).toEqual({ pickId: "a", how: "title-exact" });
    expect(
      matchOpenedLinkToPick(
        {
          catalogId: null,
          title:
            "Copo Térmico Gigante 1,2l Inox Com Tampa Canudo Rosa Verão 2026 Promoção",
        },
        picks,
      ).how,
    ).toBe("title");
  });
});
