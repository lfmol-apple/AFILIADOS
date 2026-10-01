import { describe, expect, it } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { MerchantCta } from "@/components/merchant-cta";

function findByHref(node: ReactNode): unknown {
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  if (typeof node.props.href === "string") return node.type;
  const children = node.props.children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findByHref(child);
      if (found) return found;
    }
    return undefined;
  }
  return findByHref(children as ReactNode);
}

describe("MerchantCta", () => {
  it("renders nothing commercial when there is no active link", () => {
    const element = MerchantCta({ ctaHref: null });
    expect(findByHref(element)).toBeUndefined();
  });

  it("renders a plain <a>, never next/link's <Link> — found live 2026-10-01: Link prefetches /go/ and gets recorded as a fake click (226 in two hours from Meta's crawler alone)", () => {
    const element = MerchantCta({
      ctaHref:
        "/go/mercado-livre/MLB123456?pageType=product&pageSlug=produto-teste",
    });
    expect(findByHref(element)).toBe("a");
  });
});
