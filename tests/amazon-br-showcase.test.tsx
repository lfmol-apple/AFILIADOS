import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import {
  AMAZON_SHOWCASE_ALL,
  AMAZON_SHOWCASE_FEATURED,
  AMAZON_SHOWCASE_MORE,
} from "@/lib/amazon/br-showcase";
import { AmazonShowcaseCard } from "@/components/amazon-br-showcase";

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

// The 23 links resolved during investigation (audit report), kept here only
// as the source-of-truth list to check nothing in the curated data drifted
// from what the owner actually provided.
const OWNER_PROVIDED_LINKS = [
  "https://link.amazon/B020jq5FB",
  "https://link.amazon/B05YapY8I",
  "https://link.amazon/B0exELazz",
  "https://link.amazon/B0aBqetEg",
  "https://link.amazon/B04YdvDQ6",
  "https://link.amazon/B0cb08CIe",
  "https://link.amazon/B07iZVIqD",
  "https://link.amazon/B0fsSHKLn",
  "https://link.amazon/B01zhRCK3",
  "https://link.amazon/B08M0fbGT",
  "https://link.amazon/B0c9o6oxz",
  "https://link.amazon/B0hRoLohL",
  "https://link.amazon/B0a7vEgIA",
  "https://link.amazon/B021Bb2iJ",
  "https://link.amazon/B01i7Mim3",
  "https://link.amazon/B01aNODqz",
  "https://link.amazon/B03nI5847",
  "https://link.amazon/B0giO4cYA",
  "https://link.amazon/B0ah5JBqp",
  "https://link.amazon/B04mcATEB",
  "https://link.amazon/B05prdSCD",
  "https://link.amazon/B0cNQIPrK",
  "https://link.amazon/B09zEyZef",
];

describe("Amazon BR showcase data", () => {
  it("uses only hosts of exactly link.amazon, nothing else", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      const url = new URL(product.href);
      expect(url.hostname).toBe("link.amazon");
      expect(url.protocol).toBe("https:");
    }
  });

  it("every curated href is one of the links the owner actually provided — never invented, never reconstructed", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(OWNER_PROVIDED_LINKS).toContain(product.href);
    }
  });

  it("never carries a query string — the owner's links have none, so nothing was appended (no ?tag=, no tracking params)", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      expect(product.href).not.toContain("?");
      expect(product.href).not.toContain("tag=");
    }
  });

  it("no duplicate hrefs and no duplicate ASINs across the curated selection", () => {
    const hrefs = AMAZON_SHOWCASE_ALL.map((p) => p.href);
    const asins = AMAZON_SHOWCASE_ALL.map((p) => p.asin);
    expect(new Set(hrefs).size).toBe(hrefs.length);
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

  it("shows editorially fewer than all 23 resolved links — curation, not a dump", () => {
    expect(AMAZON_SHOWCASE_ALL.length).toBeLessThan(OWNER_PROVIDED_LINKS.length);
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
  it("renders the CTA anchor with the exact href, correct rel, and target=_blank, for every curated product", () => {
    for (const product of AMAZON_SHOWCASE_ALL) {
      const element = AmazonShowcaseCard({ product });
      const anchor = findAnchor(element);
      expect(anchor).not.toBeNull();
      expect(anchor?.href).toBe(product.href);
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
