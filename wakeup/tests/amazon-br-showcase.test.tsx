import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const TAG = "precocaindo0c-20";

type Showcase = typeof import("@/lib/amazon/br-showcase");
type Card = typeof import("@/components/amazon-br-showcase");
type Content = typeof import("@/lib/amazon/br-showcase-content");
let AMAZON_SHOWCASE_ALL: Showcase["AMAZON_SHOWCASE_ALL"];
let AMAZON_SHOWCASE_FEATURED: Showcase["AMAZON_SHOWCASE_FEATURED"];
let AMAZON_SHOWCASE_MORE: Showcase["AMAZON_SHOWCASE_MORE"];
let getShowcaseHref: Showcase["getShowcaseHref"];
let AmazonShowcaseCard: Card["AmazonShowcaseCard"];
let AmazonShowcaseDetailCard: Card["AmazonShowcaseDetailCard"];
let AMAZON_SHOWCASE_DETAILS: Content["AMAZON_SHOWCASE_DETAILS"];
let AMAZON_CATEGORY_GUIDES: Content["AMAZON_CATEGORY_GUIDES"];
let AMAZON_FAQ: Content["AMAZON_FAQ"];

beforeAll(async () => {
  vi.resetModules();
  vi.stubEnv("AMAZON_BR_ENABLED", "true");
  vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", TAG);
  const data = await import("@/lib/amazon/br-showcase");
  const card = await import("@/components/amazon-br-showcase");
  const content = await import("@/lib/amazon/br-showcase-content");
  AMAZON_SHOWCASE_ALL = data.AMAZON_SHOWCASE_ALL;
  AMAZON_SHOWCASE_FEATURED = data.AMAZON_SHOWCASE_FEATURED;
  AMAZON_SHOWCASE_MORE = data.AMAZON_SHOWCASE_MORE;
  getShowcaseHref = data.getShowcaseHref;
  AmazonShowcaseCard = card.AmazonShowcaseCard;
  AmazonShowcaseDetailCard = card.AmazonShowcaseDetailCard;
  AMAZON_SHOWCASE_DETAILS = content.AMAZON_SHOWCASE_DETAILS;
  AMAZON_CATEGORY_GUIDES = content.AMAZON_CATEGORY_GUIDES;
  AMAZON_FAQ = content.AMAZON_FAQ;
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

function findAnchor(
  node: ReactNode,
): { href?: unknown; rel?: unknown; target?: unknown } | null {
  if (node == null || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findAnchor(child);
      if (found) return found;
    }
    return null;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return null;
  if (node.type === "a") {
    return {
      href: node.props.href,
      rel: node.props.rel,
      target: node.props.target,
    };
  }
  return findAnchor(node.props.children as ReactNode);
}

describe("Amazon BR showcase data", () => {
  it("builds a normal amazon.com.br product URL carrying the Tracking ID, for every product", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      const href = getShowcaseHref(product);
      expect(href).not.toBeNull();
      const url = new URL(href as string);
      expect(url.protocol).toBe("https:");
      expect(url.hostname).toBe("www.amazon.com.br");
      expect(url.pathname).toBe(`/dp/${product.asin}`);
      expect(url.searchParams.get("tag")).toBe(TAG);
      expect([...url.searchParams.keys()]).toEqual(["tag"]);
    }
  });

  it("returns no link at all when the Tracking ID is not configured — never a tagless URL", async () => {
    vi.resetModules();
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    const data = await import("@/lib/amazon/br-showcase");
    expect(data.getShowcaseHref(data.AMAZON_SHOWCASE_ALL[0])).toBeNull();
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", TAG);
  });

  it("no duplicate ASINs across the curated selection", () => {
    const asins = AMAZON_SHOWCASE_ALL.map((p) => p.asin);
    expect(new Set(asins).size).toBe(asins.length);
  });

  it("every ASIN looks like a real Amazon ASIN (10 alphanumeric chars)", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(product.asin).toMatch(/^[A-Z0-9]{10}$/);
    }
  });

  it("has no overlap between the featured tier and the 'ver todos' tier", () => {
    const featuredIds = new Set(AMAZON_SHOWCASE_FEATURED.map((p) => p.id));
    for (const product of AMAZON_SHOWCASE_MORE) {
      expect(featuredIds.has(product.id)).toBe(false);
    }
  });

  it("is a curated selection of a reasonable size", () => {
    expect(AMAZON_SHOWCASE_ALL.length).toBeGreaterThanOrEqual(8);
  });

  it("does not claim unverified superlatives in any title or description", () => {
    const forbidden =
      /mais vendid|top amazon|campe(ã|a)o de venda|mais procurad|melhor avaliad|n[úu]mero 1/i;
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(product.title).not.toMatch(forbidden);
      expect(product.description).not.toMatch(forbidden);
    }
  });

  it("does not state a price, discount, rating, or review count in any description", () => {
    const forbidden = /R\$\s?\d|\d+%\s?off|\d[,.]?\d*\s?estrelas|\d+\s?avalia/i;
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(product.description).not.toMatch(forbidden);
    }
  });

  it("each description is original and reasonably substantial (not a one-liner stub)", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(product.description.length).toBeGreaterThan(80);
    }
    const descriptions = AMAZON_SHOWCASE_ALL.map((p) => p.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });
});

describe("AmazonShowcaseCard", () => {
  it("renders the CTA anchor with the tagged product URL, correct rel, and target=_blank, for every curated product", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      const element = AmazonShowcaseCard({ product });
      const anchor = findAnchor(element);
      expect(anchor).not.toBeNull();
      expect(anchor?.href).toBe(getShowcaseHref(product));
      expect(anchor?.target).toBe("_blank");
      expect(anchor?.rel).toBe("sponsored nofollow noopener noreferrer");
    }
  });

  it("never renders a price, discount, or rating string anywhere in the card tree", () => {
    function collectText(node: ReactNode): string {
      if (node == null || typeof node === "boolean") return "";
      if (typeof node === "string" || typeof node === "number")
        return String(node);
      if (Array.isArray(node)) return node.map(collectText).join(" ");
      if (!isValidElement<Record<string, unknown>>(node)) return "";
      return collectText(node.props.children as ReactNode);
    }
    const forbidden = /R\$\s?\d|\d+%\s?off|\d[,.]?\d*\s?estrelas|\d+\s?avalia/i;
    for (const product of AMAZON_SHOWCASE_ALL) {
      const text = collectText(AmazonShowcaseCard({ product }));
      expect(text).not.toMatch(forbidden);
    }
  });
});

describe("Achados editorial content", () => {
  const FORBIDDEN_CLAIMS =
    /R\$\s?\d|\d+%\s?off|\d[,.]?\d*\s?estrelas|\d+\s?avalia|mais vendid|top amazon|campe(ã|a)o de venda|mais procurad|melhor avaliad|n[úu]mero 1/i;

  function allTexts(): string[] {
    return [
      ...Object.values(AMAZON_SHOWCASE_DETAILS).flatMap((d) => [
        d.paraQuem,
        d.naoIndicado,
        ...d.antesDeComprar,
      ]),
      ...Object.values(AMAZON_CATEGORY_GUIDES).flatMap((g) => [
        g.intro,
        ...g.criterios.flatMap((c) => [c.titulo, c.texto]),
      ]),
      ...AMAZON_FAQ.flatMap((f) => [f.pergunta, f.resposta]),
    ];
  }

  it("has commentary for every curated product, and none for products that do not exist", () => {
    const ids = new Set(AMAZON_SHOWCASE_ALL.map((p) => p.id));
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(AMAZON_SHOWCASE_DETAILS[product.id], product.id).toBeDefined();
    }
    for (const id of Object.keys(AMAZON_SHOWCASE_DETAILS)) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it("gives each product substantive, non-duplicated guidance", () => {
    const seen = new Set<string>();
    for (const [id, d] of Object.entries(AMAZON_SHOWCASE_DETAILS)) {
      expect(d.paraQuem.length, id).toBeGreaterThan(80);
      expect(d.naoIndicado.length, id).toBeGreaterThan(50);
      expect(d.antesDeComprar.length, id).toBeGreaterThanOrEqual(3);
      for (const item of d.antesDeComprar)
        expect(item.length, id).toBeGreaterThan(40);
      expect(seen.has(d.paraQuem), id).toBe(false);
      seen.add(d.paraQuem);
    }
  });

  it("has a buying guide for every category used and an FAQ", () => {
    const categories = new Set(AMAZON_SHOWCASE_ALL.map((p) => p.category));
    for (const category of categories) {
      const guide = AMAZON_CATEGORY_GUIDES[category];
      expect(guide, category).toBeDefined();
      expect(guide.intro.length).toBeGreaterThan(100);
      expect(guide.criterios.length).toBeGreaterThanOrEqual(3);
    }
    expect(AMAZON_FAQ.length).toBeGreaterThanOrEqual(4);
  });

  it("never states a price, discount, rating, review count or unverified superlative", () => {
    for (const text of allTexts()) {
      expect(text).not.toMatch(FORBIDDEN_CLAIMS);
    }
  });

  it("renders the detail card with the tagged Amazon link and the pre-purchase checklist", () => {
    function collectText(node: ReactNode): string {
      if (node == null || typeof node === "boolean") return "";
      if (typeof node === "string" || typeof node === "number")
        return String(node);
      if (Array.isArray(node)) return node.map(collectText).join(" ");
      if (!isValidElement<Record<string, unknown>>(node)) return "";
      return collectText(node.props.children as ReactNode);
    }
    for (const product of AMAZON_SHOWCASE_ALL) {
      const element = AmazonShowcaseDetailCard({ product });
      const anchor = findAnchor(element);
      expect(anchor?.href).toBe(getShowcaseHref(product));
      expect(String(anchor?.href)).toContain(`tag=${TAG}`);
      expect(anchor?.target).toBe("_blank");
      expect(anchor?.rel).toBe("sponsored nofollow noopener noreferrer");
      const text = collectText(element);
      expect(text).toContain("Antes de comprar, confira");
      expect(text).toContain(
        AMAZON_SHOWCASE_DETAILS[product.id].antesDeComprar[0],
      );
    }
  });
});
