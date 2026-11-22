import { describe, expect, it } from "vitest";
import { isValidElement } from "react";
import { VitrineFeaturedProduct } from "@/components/vitrine-featured-product";
import type { VitrinePublicProduct } from "@/lib/queries/vitrine-public";

/**
 * Owner's authorization, 2026-11-22 (Etapa 5, "Pixel da Meta...
 * preparado para múltiplas vitrines"). Same plain-function-call pattern
 * as tests/affiliate-outbound-link.test.tsx — proves the real wiring
 * this component now carries: ViewContent fires for this one featured
 * product (never the grid below it), the CTA is genuinely an
 * AffiliateOutboundLink (never a plain `<a>` that would silently drop
 * the click event), and both use `product.id` — the real
 * MerchantListing.id, the SAME field app/catalogo/mercado-livre.xml/
 * route.ts publishes as `g:id` — never VitrineSelection's own id.
 */
const product: VitrinePublicProduct = {
  vitrineSelectionId: "vs-real-456",
  id: "ml-real-123",
  merchant: "MERCADO_LIVRE",
  title: "Secador De Cabelos Philco",
  imageUrl: "https://example.com/secador.jpg",
  currentPrice: 149.9,
  referencePrice: 199.9,
  discountPercent: 0.25,
  rating: null,
  soldQuantity: null,
  opportunitySignal: null,
  href: "/go/vitrine/mercado-livre/MLB123456?pageType=vitrine&pageSlug=secador-philco",
  detailHref: "/produto/secador-philco",
};

function findByType(node: React.ReactNode, type: unknown): React.ReactElement | null {
  if (!isValidElement(node)) return null;
  if (node.type === type) return node;
  const children = (node.props as { children?: React.ReactNode })?.children;
  if (!children) return null;
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findByType(child, type);
    if (found) return found;
  }
  return null;
}

describe("VitrineFeaturedProduct — Meta Pixel wiring (Etapa 5)", () => {
  it("fires VitrineViewContentBeacon for this featured product, using the real merchantListingId (product.id)", async () => {
    const { VitrineViewContentBeacon } = await import("@/components/vitrine-view-content-beacon");
    const tree = VitrineFeaturedProduct({ product });
    const beacon = findByType(tree, VitrineViewContentBeacon);
    expect(beacon).not.toBeNull();
    expect(beacon!.props).toMatchObject({
      merchantListingId: product.id,
      title: product.title,
      price: product.currentPrice,
    });
  });

  it("wraps the 'Ver no Mercado Livre' CTA in a real AffiliateOutboundLink, with the exact unmodified href", async () => {
    const { AffiliateOutboundLink } = await import("@/components/affiliate-outbound-link");
    const tree = VitrineFeaturedProduct({ product });
    const cta = findByType(tree, AffiliateOutboundLink);
    expect(cta).not.toBeNull();
    const props = cta!.props as { href: string; product: { merchantListingId: string; price: number | null } };
    expect(props.href).toBe(product.href);
    expect(props.product.merchantListingId).toBe(product.id); // same field as the catalog's g:id — never vitrineSelectionId
    expect(props.product.price).toBe(product.currentPrice);
  });
});
