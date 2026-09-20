import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const TAG = "precocaindo0c-20";

type Showcase = typeof import("@/lib/amazon/br-showcase");
type Card = typeof import("@/components/amazon-br-showcase");
let AMAZON_SHOWCASE_ALL: Showcase["AMAZON_SHOWCASE_ALL"];
let AMAZON_SHOWCASE_FEATURED: Showcase["AMAZON_SHOWCASE_FEATURED"];
let AMAZON_SHOWCASE_MORE: Showcase["AMAZON_SHOWCASE_MORE"];
let getShowcaseHref: Showcase["getShowcaseHref"];
let AmazonShowcaseCard: Card["AmazonShowcaseCard"];

beforeAll(async () => {
  vi.resetModules();
  vi.stubEnv("AMAZON_BR_ENABLED", "true");
  vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", TAG);
  const data = await import("@/lib/amazon/br-showcase");
  const card = await import("@/components/amazon-br-showcase");
  AMAZON_SHOWCASE_ALL = data.AMAZON_SHOWCASE_ALL;
  AMAZON_SHOWCASE_FEATURED = data.AMAZON_SHOWCASE_FEATURED;
  AMAZON_SHOWCASE_MORE = data.AMAZON_SHOWCASE_MORE;
  getShowcaseHref = data.getShowcaseHref;
  AmazonShowcaseCard = card.AmazonShowcaseCard;
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
