import { describe, expect, it, vi } from "vitest";
import { isValidElement } from "react";

/**
 * Same plain-function-call pattern as tests/merchant-cta.test.tsx (no
 * renderer needed) — calls the component directly and inspects the
 * returned React element, proving B5's hard requirements: the real href
 * is preserved exactly, it's a plain <a> (never a next/link <Link>,
 * same reasoning merchant-cta.test.tsx already established — a
 * prefetched/intercepted link must never be the real affiliate link's
 * wrapper), and the onClick never calls preventDefault.
 */

vi.mock("@/lib/analytics/meta-pixel-client", () => ({
  trackAffiliateOutboundClick: vi.fn(),
  trackAddToCart: vi.fn(),
}));

import { trackAffiliateOutboundClick, trackAddToCart } from "@/lib/analytics/meta-pixel-client";
import { AffiliateOutboundLink } from "@/components/affiliate-outbound-link";

const REAL_HREF = "/go/vitrine/mercado-livre/MLB123456?pageType=product&pageSlug=secador-philco";
const product = { merchantListingId: "vs-real-123", title: "Secador De Cabelos Philco", price: 149.9 };

describe("AffiliateOutboundLink — never alters the real affiliate link, only adds a side-effect on click", () => {
  it("renders a plain <a> with the exact, unmodified href", () => {
    const element = AffiliateOutboundLink({ product, href: REAL_HREF, children: "Ver no Mercado Livre →" });
    expect(isValidElement(element)).toBe(true);
    expect(element.type).toBe("a");
    expect((element.props as { href: string }).href).toBe(REAL_HREF);
  });

  it("fires trackAffiliateOutboundClick on click, with the real product identity, but never calls preventDefault", () => {
    const element = AffiliateOutboundLink({ product, href: REAL_HREF, children: "Ver no Mercado Livre →" });
    const onClick = (element.props as { onClick: (e: unknown) => void }).onClick;
    const fakeEvent = { preventDefault: vi.fn() };
    onClick(fakeEvent);
    expect(trackAffiliateOutboundClick).toHaveBeenCalledWith(product);
    expect(fakeEvent.preventDefault).not.toHaveBeenCalled();
  });

  it("also fires the standard trackAddToCart on the same click, alongside the custom event (2026-11-25 directive)", () => {
    const element = AffiliateOutboundLink({ product, href: REAL_HREF, children: "Ver no Mercado Livre →" });
    const onClick = (element.props as { onClick: (e: unknown) => void }).onClick;
    onClick({ preventDefault: vi.fn() });
    expect(trackAddToCart).toHaveBeenCalledWith(product);
    expect(trackAffiliateOutboundClick).toHaveBeenCalledWith(product);
  });

  it("never forces a new tab (no target='_blank' added) and never appends anything to the href via rel/query", () => {
    const element = AffiliateOutboundLink({ product, href: REAL_HREF, children: "Ver no Mercado Livre →" });
    const props = element.props as Record<string, unknown>;
    expect(props.target).toBeUndefined();
  });

  it("preserves a caller-provided className exactly, same as the plain <a> it replaces", () => {
    const element = AffiliateOutboundLink({ product, href: REAL_HREF, className: "mt-5 block rounded-full", children: "Ver →" });
    expect((element.props as { className: string }).className).toBe("mt-5 block rounded-full");
  });
});
