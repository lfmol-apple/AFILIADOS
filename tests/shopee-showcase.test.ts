import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db";
import { getShopeeShowcase } from "@/lib/queries/shopee-showcase";
import { isValidElement, type ReactNode } from "react";
import { ShopeeShowcase } from "@/components/shopee-showcase";

let merchantId: string;
const listingIds: string[] = [];
const runId = Date.now();

async function makeListing(input: {
  title: string;
  score: number;
  linkStatus: "ACTIVE" | "PENDING" | null;
}) {
  const listing = await prisma.merchantListing.create({
    data: {
      merchantId,
      externalId: `TEST-SHOWCASE-${runId}-${listingIds.length}`,
      externalIdType: "MERCHANT_PRODUCT_ID",
      marketplace: "BR",
      productUrl: "https://shopee.com.br/product/1/1",
    },
  });
  listingIds.push(listing.id);

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "test",
      raw: { productName: input.title },
    },
  });

  await prisma.monetizationScore.create({
    data: {
      merchantListingId: listing.id,
      score: input.score,
      confidence: 0.8,
      components: {},
      reasons: [],
      missingSignals: [],
    },
  });

  if (input.linkStatus) {
    await prisma.affiliateLinkRegistry.create({
      data: {
        merchantListingId: listing.id,
        merchantId,
        publicUrl: listing.productUrl,
        affiliateUrl: `https://s.shopee.com.br/test-${listingIds.length}`,
        attributionTag: "precocaindo",
        source: "API",
        status: input.linkStatus,
      },
    });
  }

  return listing;
}

beforeAll(async () => {
  const merchant = await prisma.merchant.upsert({
    where: { code: "SHOPEE" },
    create: { code: "SHOPEE", name: "Shopee", active: true },
    update: {},
  });
  merchantId = merchant.id;
});

afterAll(async () => {
  await prisma.merchantListing.deleteMany({ where: { id: { in: listingIds } } });
});

describe("getShopeeShowcase", () => {
  it("includes a listing with an ACTIVE link and a MonetizationScore, ordered by score desc", async () => {
    const low = await makeListing({ title: "Item baixo", score: 40, linkStatus: "ACTIVE" });
    const high = await makeListing({ title: "Item alto", score: 90, linkStatus: "ACTIVE" });

    const items = await getShopeeShowcase(50);
    const filtered = items.filter(
      (i) => i.merchantListingId === low.id || i.merchantListingId === high.id,
    );
    expect(filtered.map((i) => i.merchantListingId)).toEqual([high.id, low.id]);
    expect(filtered[0]!.title).toBe("Item alto");
  });

  it("excludes a listing whose link is PENDING, not ACTIVE — never shows a commercial CTA without a working link", async () => {
    const pending = await makeListing({ title: "Pendente", score: 99, linkStatus: "PENDING" });
    const items = await getShopeeShowcase(50);
    expect(items.map((i) => i.merchantListingId)).not.toContain(pending.id);
  });

  it("excludes a listing with no affiliate link row at all", async () => {
    const none = await makeListing({ title: "Sem link", score: 99, linkStatus: null });
    const items = await getShopeeShowcase(50);
    expect(items.map((i) => i.merchantListingId)).not.toContain(none.id);
  });
});

function collectAnchors(
  node: ReactNode,
): Array<{ href?: unknown; rel?: unknown; target?: unknown }> {
  if (node == null || typeof node === "boolean") return [];
  if (typeof node === "string" || typeof node === "number") return [];
  if (Array.isArray(node)) return node.flatMap(collectAnchors);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  const self =
    node.type === "a"
      ? [{ href: node.props.href, rel: node.props.rel, target: node.props.target }]
      : [];
  return [...self, ...collectAnchors(node.props.children as ReactNode)];
}

describe("ShopeeShowcase component", () => {
  it("renders nothing when there are no items", () => {
    expect(ShopeeShowcase({ items: [] })).toBeNull();
  });

  it("every card's CTA links through the internal /go/shopee redirect, never the raw affiliateUrl directly", () => {
    const element = ShopeeShowcase({
      items: [
        {
          merchantListingId: "x",
          externalId: "12345",
          title: "Produto Teste",
          affiliateUrl: "https://s.shopee.com.br/should-not-appear",
          monetizationScore: 80,
        },
      ],
    });
    const anchors = collectAnchors(element);
    expect(anchors).toHaveLength(1);
    expect(anchors[0]!.href).toBe(
      "/go/shopee/12345?pageType=ofertas&pageSlug=ofertas&source=shopee_showcase",
    );
    expect(anchors[0]!.target).toBe("_blank");
    expect(anchors[0]!.rel).toBe("sponsored nofollow noopener noreferrer");
  });
});
