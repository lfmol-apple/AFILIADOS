import { describe, expect, it, vi, afterEach } from "vitest";
import { isValidElement, type ReactNode } from "react";

function collectHrefs(node: ReactNode): string[] {
  if (node == null || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [];
  if (Array.isArray(node)) return node.flatMap((child) => collectHrefs(child));
  if (!isValidElement<Record<string, unknown>>(node)) return [];

  const href = typeof node.props.href === "string" ? [node.props.href] : [];
  return [...href, ...collectHrefs(node.props.children as ReactNode)];
}

describe("AmazonCta", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("does not render a commercial Amazon link when the BR tracking ID is missing", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "");
    vi.stubEnv("AMAZON_ASSOCIATE_TAG", "");

    const { AmazonCta } = await import("@/components/amazon-cta");
    const element = AmazonCta({
      asin: "B0MOCK0001",
      pageType: "product",
      pageSlug: "produto-teste",
    });

    expect(collectHrefs(element)).toEqual([]);
    expect(isValidElement<Record<string, unknown>>(element)).toBe(true);
    if (isValidElement<Record<string, unknown>>(element)) {
      expect(element.type).toBe("p");
      expect(element.props.role).toBe("status");
    }
  });

  it("renders only the guarded redirect path when the BR tracking ID is confirmed", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");

    const { AmazonCta } = await import("@/components/amazon-cta");
    const element = AmazonCta({
      asin: "B0MOCK0001",
      pageType: "product",
      pageSlug: "produto-teste",
    });

    const hrefs = collectHrefs(element);
    expect(hrefs).toContain(
      "/go/amazon/B0MOCK0001?pageType=product&pageSlug=produto-teste",
    );
    expect(hrefs.some((href) => href.includes("amazon.com"))).toBe(false);
    expect(hrefs.some((href) => href.includes("tag="))).toBe(false);
  });

  it("does not render a redirect for invalid ASIN values", async () => {
    vi.stubEnv("AMAZON_BR_ENABLED", "true");
    vi.stubEnv("AMAZON_BR_ASSOCIATE_TAG", "confirmed-preco-20");

    const { AmazonCta } = await import("@/components/amazon-cta");
    const element = AmazonCta({
      asin: "not-an-asin",
      pageType: "product",
      pageSlug: "produto-teste",
    });

    expect(collectHrefs(element)).toEqual([]);
  });
});
