import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { UnifiedOfferCard } from "@/components/unified-offer-card";
import { AffiliateOutboundLink } from "@/components/affiliate-outbound-link";
import type { UnifiedOfferCard as UnifiedOfferCardData } from "@/lib/queries/unified-offers";

/**
 * Henrique's team, 2026-11-26 ("os botões 'Ver no Mercado Livre' dos
 * cards da home... não disparam AffiliateOutboundClick"): this component
 * is the one real gap — home, /ofertas and the Vitrine's rest-of-grid all
 * render it. Proves the real fix (components/unified-offer-card.tsx):
 * ML/Shopee cards now render AffiliateOutboundLink (never altering
 * href/target/rel), Amazon cards deliberately keep the plain untracked
 * <a> (item.id is Product.id there, a different id space than
 * MerchantListing.id — see the component's own doc comment), and a card
 * with an unknown price never fires either (never a guessed value).
 */
/**
 * Same lightweight "call components as plain functions, never mount a
 * real DOM" pattern tests/merchant-cta.test.tsx already uses — extended
 * to also step INTO a custom function component (like this file's own
 * private CardAnchor) by calling it with its own props, since
 * UnifiedOfferCard composes one.
 */
function findFirstOfType(node: ReactNode, type: unknown): ReactElement | undefined {
  if (!isValidElement(node)) return undefined;
  if (node.type === type) return node;
  if (typeof node.type === "function" && node.type !== type) {
    const rendered = (node.type as (props: unknown) => ReactNode)(node.props);
    const found = findFirstOfType(rendered, type);
    if (found) return found;
  }
  const children = (node.props as { children?: ReactNode }).children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const found = findFirstOfType(child, type);
      if (found) return found;
    }
    return undefined;
  }
  return findFirstOfType(children, type);
}

const base: UnifiedOfferCardData = {
  id: "cmtest000000000000000001",
  merchant: "MERCADO_LIVRE",
  title: "Produto Teste",
  imageUrl: null,
  currentPrice: 99.9,
  referencePrice: null,
  discountPercent: null,
  rating: null,
  soldQuantity: null,
  opportunitySignal: null,
  href: "/go/mercado-livre/MLB123456?pageType=product",
  detailHref: "/produto/produto-teste",
};

describe("UnifiedOfferCard — commercial click tracking", () => {
  it("MERCADO_LIVRE card with a known price renders AffiliateOutboundLink with the real merchantListingId/title/price and the canonical /produto URL", () => {
    const element = UnifiedOfferCard({ item: base });
    const link = findFirstOfType(element, AffiliateOutboundLink);
    expect(link).toBeDefined();
    const product = (link!.props as { product: { merchantListingId: string; title: string; price: number; canonicalUrl: string | null } }).product;
    expect(product.merchantListingId).toBe(base.id);
    expect(product.title).toBe(base.title);
    expect(product.price).toBe(99.9);
    expect(product.canonicalUrl).toContain("/produto/produto-teste");
    expect((link!.props as { href: string }).href).toBe(base.href);
  });

  it("SHOPEE card with a known price also renders AffiliateOutboundLink — same real MerchantListing.id space as ML", () => {
    const element = UnifiedOfferCard({ item: { ...base, merchant: "SHOPEE" } });
    const link = findFirstOfType(element, AffiliateOutboundLink);
    expect(link).toBeDefined();
  });

  it("AMAZON card never fires the event — item.id is Product.id there, not a MerchantListing.id", () => {
    const element = UnifiedOfferCard({ item: { ...base, merchant: "AMAZON" } });
    const link = findFirstOfType(element, AffiliateOutboundLink);
    expect(link).toBeUndefined();
    const anchor = findFirstOfType(element, "a");
    expect(anchor).toBeDefined();
  });

  it("a card with an unknown price never fires the event either — never a guessed value", () => {
    const element = UnifiedOfferCard({ item: { ...base, currentPrice: null } });
    const link = findFirstOfType(element, AffiliateOutboundLink);
    expect(link).toBeUndefined();
  });

  it("omits canonicalUrl when there is no public /produto slug yet — never fabricated", () => {
    const element = UnifiedOfferCard({ item: { ...base, detailHref: undefined } });
    const link = findFirstOfType(element, AffiliateOutboundLink);
    const product = (link!.props as { product: { canonicalUrl: string | null } }).product;
    expect(product.canonicalUrl).toBeNull();
  });
});
