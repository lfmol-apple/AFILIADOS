import { describe, expect, it } from "vitest";
import { isPrefetchRequest } from "@/lib/http/is-prefetch-request";

function headers(h: Record<string, string> = {}): Headers {
  return new Headers(h);
}

describe("isPrefetchRequest", () => {
  it("a plain real-navigation GET is never a prefetch", () => {
    expect(isPrefetchRequest(headers(), new URLSearchParams())).toBe(false);
    expect(
      isPrefetchRequest(
        headers({ "user-agent": "Mozilla/5.0" }),
        new URLSearchParams("pageType=product&source=product_page"),
      ),
    ).toBe(false);
  });

  it("Next.js's own router-prefetch header marks it a prefetch", () => {
    expect(
      isPrefetchRequest(
        headers({ "next-router-prefetch": "1" }),
        new URLSearchParams(),
      ),
    ).toBe(true);
  });

  it("the `_rsc` query param alone marks it a prefetch — the exact signature found live 2026-10-01 (Meta's crawler rendering a product page triggered next/link's prefetch of the merchant CTA)", () => {
    expect(
      isPrefetchRequest(
        headers(),
        new URLSearchParams("pageType=product&source=product_page&_rsc=abc123"),
      ),
    ).toBe(true);
    expect(
      isPrefetchRequest(headers(), new URLSearchParams("_rsc=abc123")),
    ).toBe(true);
  });

  it("the purpose/sec-purpose prefetch headers also mark it a prefetch", () => {
    expect(
      isPrefetchRequest(
        headers({ purpose: "prefetch" }),
        new URLSearchParams(),
      ),
    ).toBe(true);
    expect(
      isPrefetchRequest(
        headers({ "sec-purpose": "prefetch;prerender" }),
        new URLSearchParams(),
      ),
    ).toBe(true);
  });
});
