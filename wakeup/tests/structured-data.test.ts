import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbList,
  buildFaqPage,
  jsonLdScriptPayload,
} from "@/lib/seo/structured-data";
import { isProductPageIndexable } from "@/lib/seo/indexability";

describe("buildBreadcrumbList", () => {
  it("produces a valid BreadcrumbList with 1-indexed positions", () => {
    const result = buildBreadcrumbList([
      { label: "Início", href: "/" },
      { label: "Eletrônicos", href: "/categorias/eletronicos" },
      { label: "Fone Bluetooth" },
    ]);

    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toHaveLength(3);
    expect(result.itemListElement[0].position).toBe(1);
    expect(result.itemListElement[2].position).toBe(3);
  });

  it("omits `item` for the current page (no href)", () => {
    const result = buildBreadcrumbList([
      { label: "Início", href: "/" },
      { label: "Produto atual" },
    ]);
    expect(result.itemListElement[1].item).toBeUndefined();
  });

  it("resolves hrefs to absolute URLs", () => {
    const result = buildBreadcrumbList([{ label: "Início", href: "/" }]);
    expect(result.itemListElement[0].item).toMatch(/^https?:\/\//);
  });
});

describe("buildFaqPage", () => {
  it("produces FAQPage structured data from visible FAQ content", () => {
    const result = buildFaqPage([
      { question: "Pergunta?", answer: "Resposta." },
    ]);

    expect(result["@type"]).toBe("FAQPage");
    expect(result.mainEntity[0].name).toBe("Pergunta?");
    expect(result.mainEntity[0].acceptedAnswer.text).toBe("Resposta.");
  });
});

describe("jsonLdScriptPayload", () => {
  it("escapes less-than characters before injecting JSON-LD", () => {
    expect(jsonLdScriptPayload({ text: "<script>" })).toContain(
      "\\u003cscript>",
    );
  });
});

describe("isProductPageIndexable", () => {
  it("is not indexable with no description, no specs, and almost no history", () => {
    expect(
      isProductPageIndexable({
        coverageDays: 0,
        hasDescription: false,
        specCount: 0,
      }),
    ).toBe(false);
  });

  it("is indexable once there's a real description, even with no history", () => {
    expect(
      isProductPageIndexable({
        coverageDays: 0,
        hasDescription: true,
        specCount: 0,
      }),
    ).toBe(true);
  });

  it("is indexable once there are specifications", () => {
    expect(
      isProductPageIndexable({
        coverageDays: 0,
        hasDescription: false,
        specCount: 3,
      }),
    ).toBe(true);
  });

  it("is indexable once there's enough price history", () => {
    expect(
      isProductPageIndexable({
        coverageDays: 5,
        hasDescription: false,
        specCount: 0,
      }),
    ).toBe(true);
  });
});
