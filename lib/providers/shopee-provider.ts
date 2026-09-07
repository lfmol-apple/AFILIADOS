import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";
import { buildShopeeAuthorizationHeader } from "@/lib/shopee/signature";

const GRAPHQL_ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

/**
 * Real Shopee AFFILIATE API integration (GraphQL) — NOT the Shopee Open
 * Platform seller API this file previously (and wrongly) targeted. Endpoint,
 * signature formula, and field names below come from third-party technical
 * documentation of the official API (2026-09-07 research — see
 * docs/AFFILIATE_LINK_REGISTRY.md for the full trail), not from browsing
 * this account's own Playground directly. Verify against the account's own
 * docs/Playground before relying on this for real revenue — the code fails
 * loud and never calls the network without real credentials either way.
 *
 * `productOfferV2`'s response fields are confirmed; its exact GraphQL
 * connection wrapper (`nodes { ... }`) matches the common shape used by
 * this API in the sources found, but was not independently verified
 * end-to-end against a live account. `generateShortLink`'s
 * input/output shape (`originUrl`, `subIds` -> `shortLink`) is more
 * directly confirmed.
 */
export class ShopeeProvider implements CommerceProvider {
  readonly name = "SHOPEE" as const;
  readonly marketplace = "BR" as const;
  readonly capabilities = {
    search: true,
    productLookup: true,
    offers: true,
    affiliateUrl: true,
  };

  private readonly appId: string;
  private readonly secretKey: string;

  constructor() {
    if (!env.SHOPEE_AFFILIATE_ENABLED) {
      throw new Error(
        "ShopeeProvider requires SHOPEE_AFFILIATE_ENABLED=true. See docs/AFFILIATE_LINK_REGISTRY.md.",
      );
    }
    if (!env.SHOPEE_AFFILIATE_API_ENABLED || !env.SHOPEE_APP_ID || !env.SHOPEE_SECRET_KEY) {
      throw new Error(
        "ShopeeProvider requires SHOPEE_AFFILIATE_API_ENABLED=true plus SHOPEE_APP_ID/SHOPEE_SECRET_KEY. " +
          "See docs/AFFILIATE_LINK_REGISTRY.md.",
      );
    }
    this.appId = env.SHOPEE_APP_ID;
    this.secretKey = env.SHOPEE_SECRET_KEY;
  }

  async searchProducts(query: ProductSearchQuery): Promise<ProductSearchResult> {
    const nodes = await this.queryProductOffers({
      keyword: query.keywords,
      page: query.page ?? 1,
      limit: 20,
    });
    const products = nodes.map(toNormalizedProduct);
    return { products, totalResults: products.length, page: query.page ?? 1 };
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    const itemId = Number(externalId);
    if (!Number.isInteger(itemId)) {
      throw new Error(
        `ShopeeProvider.getProduct: externalId must be a numeric Shopee itemId, got "${externalId}".`,
      );
    }
    const nodes = await this.queryProductOffers({ itemId, page: 1, limit: 1 });
    return nodes[0] ? toNormalizedProduct(nodes[0]) : null;
  }

  async getProducts(externalIds: string[]): Promise<NormalizedProduct[]> {
    const results = await Promise.all(
      externalIds.map((id) => this.getProduct(id)),
    );
    return results.filter((p): p is NormalizedProduct => p !== null);
  }

  async getOffers(
    externalIds: string[],
  ): Promise<Record<string, NormalizedOffer | null>> {
    const products = await Promise.all(
      externalIds.map(async (id) => [id, await this.getProduct(id)] as const),
    );
    return Object.fromEntries(
      products.map(([id, product]) => [id, product?.offer ?? null]),
    );
  }

  /**
   * The full commercial-signal-bearing offer nodes — commissionRate,
   * sales, ratingStar, etc. — that NormalizedProduct/NormalizedOffer
   * deliberately don't carry (project brief: don't force affiliate-specific
   * fields into the provider-agnostic shape). Not part of CommerceProvider;
   * used by anything that needs the real commercial fields to compute a
   * MonetizationScore (see scripts/shopee-first-cycle.ts), instead of
   * reaching into this class's private query method.
   */
  async listOffers(input: {
    itemId?: number;
    keyword?: string;
    page?: number;
    limit?: number;
  }): Promise<ShopeeProductOfferNode[]> {
    return this.queryProductOffers({
      itemId: input.itemId,
      keyword: input.keyword,
      page: input.page ?? 1,
      limit: input.limit ?? 20,
    });
  }

  /**
   * Generates a real, tracked affiliate short link via the confirmed
   * `generateShortLink` mutation. Not part of the CommerceProvider
   * interface — this is Shopee-specific commercial functionality, called
   * by lib/services/affiliate-link-registry.ts's saveApiGeneratedAffiliateLink
   * path, never by anything that just wants catalog data.
   */
  async generateAffiliateLink(
    originUrl: string,
    subIds: string[],
  ): Promise<string> {
    const query = `mutation{generateShortLink(input:{originUrl:"${escapeGraphqlString(originUrl)}",subIds:[${subIds
      .map((s) => `"${escapeGraphqlString(s)}"`)
      .join(",")}]}){shortLink}}`;

    const body = await this.executeGraphql<{
      generateShortLink: { shortLink: string };
    }>(query);
    return body.generateShortLink.shortLink;
  }

  private async queryProductOffers(input: {
    itemId?: number;
    keyword?: string;
    page: number;
    limit: number;
  }): Promise<ShopeeProductOfferNode[]> {
    const args: string[] = [`page:${input.page}`, `limit:${input.limit}`];
    if (input.itemId !== undefined) args.push(`itemId:${input.itemId}`);
    if (input.keyword) args.push(`keyword:"${escapeGraphqlString(input.keyword)}"`);

    const query = `{productOfferV2(${args.join(",")}){nodes{itemId productName imageUrl productLink offerLink priceMin priceMax priceDiscountRate commissionRate sellerCommissionRate shopeeCommissionRate commission sales ratingStar shopId shopName shopType}}}`;

    const body = await this.executeGraphql<{
      productOfferV2: { nodes: ShopeeProductOfferNode[] };
    }>(query);
    return body.productOfferV2.nodes;
  }

  private async executeGraphql<T>(query: string): Promise<T> {
    const payload = JSON.stringify({ query });
    const timestamp = Math.floor(Date.now() / 1000);
    const authorization = buildShopeeAuthorizationHeader({
      appId: this.appId,
      secretKey: this.secretKey,
      timestamp,
      payload,
    });

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authorization,
      },
      body: payload,
    });

    if (!response.ok) {
      logger.error("shopee.graphql_request_failed", { status: response.status });
      throw new Error(`ShopeeProvider GraphQL request failed: HTTP ${response.status}`);
    }

    const json = (await response.json()) as { data?: T; errors?: unknown[] };
    if (json.errors && json.errors.length > 0) {
      logger.error("shopee.graphql_errors", { errors: json.errors });
      throw new Error(
        `ShopeeProvider GraphQL request returned errors: ${JSON.stringify(json.errors)}`,
      );
    }
    if (!json.data) {
      throw new Error("ShopeeProvider GraphQL request returned no data.");
    }
    return json.data;
  }
}

function escapeGraphqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Response fields confirmed via research (2026-09-07) AND corrected
// against a real live response the same day: GraphQL returns priceMin/
// priceMax/commissionRate/sellerCommissionRate/shopeeCommissionRate/
// commission/ratingStar as STRINGS (a precision-preserving custom scalar,
// not a JSON number), while sales/shopId/priceDiscountRate come back as
// real numbers, and shopType as an array of numbers, not a string. Getting
// this wrong crashed the first real Prisma write (Decimal/Float columns
// rejecting a string) — fixed here from the actual response, not guessed.
export interface ShopeeProductOfferNode {
  itemId: number;
  productName: string;
  // Confirmed via a real live productOfferV2 call (2026-09-07): a plain
  // https:// CDN URL string, not a wrapper object — added because the
  // showcase went live with no product images (the query never asked for
  // this field).
  imageUrl?: string;
  productLink: string;
  offerLink: string;
  priceMin: string;
  priceMax: string;
  priceDiscountRate?: number;
  commissionRate?: string;
  sellerCommissionRate?: string;
  shopeeCommissionRate?: string;
  commission?: string;
  sales?: number;
  ratingStar?: string;
  shopId?: number;
  shopName?: string;
  shopType?: number[];
}

/** Shopee's numeric-looking fields arrive as strings (see
 * ShopeeProductOfferNode's doc comment) — this is the one place that
 * coerces them, so every caller (toNormalizedProduct, scripts/
 * shopee-first-cycle.ts) works with real numbers, never re-implementing
 * the same parseFloat. Returns undefined for undefined/unparseable input,
 * never NaN or a fabricated 0. */
export function shopeeNumeric(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function toNormalizedProduct(node: ShopeeProductOfferNode): NormalizedProduct {
  const offer: NormalizedOffer = {
    price: shopeeNumeric(node.priceMin) ?? 0,
    currency: "BRL",
    // offerLink already carries Shopee's own default affiliate tracking;
    // it is NOT the same as a generateShortLink result with our own
    // subIds. Never presented as "our" tracked link — see
    // lib/services/affiliate-link-registry.ts, which uses
    // generateAffiliateLink() for that instead.
    affiliateUrl: node.offerLink,
    availability: "UNKNOWN",
    observedAt: new Date(),
  };

  return {
    asin: String(node.itemId),
    provider: "SHOPEE",
    title: node.productName,
    offer,
  };
}
