import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

const API_BASE = "https://api.mercadolibre.com";

/**
 * Real Mercado Livre catalog integration — NOT an affiliate integration.
 * `getProduct`/`getProducts` call the confirmed public-catalog endpoint
 * (GET /items/{id}); `NormalizedOffer.affiliateUrl` below is the item's
 * plain `permalink`, never a monetized/tagged link — Mercado Livre's
 * affiliate/commission program is a separate, unconfirmed integration this
 * class does not implement (project brief: "Não trate API pública de
 * catálogo/demanda como API de afiliados. COMISSÃO CONTINUA EM CAMADA
 * SEPARADA" — see lib/services/monetization-score.ts instead).
 *
 * Endpoints and their auth requirement were confirmed by direct research
 * on 2026-09-07 (developers.mercadolibre.com + empirical testing — every
 * one of these, including historically-public ones like GET /sites,
 * currently returns 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES without a
 * bearer token). `searchProducts`/`getOffers`'s underlying multi-item
 * shape was NOT confirmed with the same rigor, so they intentionally stay
 * unimplemented rather than guess a request/response shape — see
 * docs/MONETIZATION_SCORE.md for the full research trail.
 *
 * Getting MERCADO_LIVRE_ACCESS_TOKEN requires registering an application
 * in Mercado Livre's DevCenter and completing their OAuth flow — a human
 * step outside this codebase. Every method throws immediately if that
 * token (or MERCADO_LIVRE_ENABLED/API_ENABLED) isn't set — no silent
 * fallback, no scraping, no guessed endpoint ever called.
 */
export class MercadoLivreProvider implements CommerceProvider {
  readonly name = "MERCADO_LIVRE" as const;
  readonly marketplace = "BR" as const;
  readonly capabilities = {
    search: false,
    productLookup: true,
    offers: true,
    affiliateUrl: false,
  };

  private readonly siteId: string;
  private readonly accessToken: string;

  constructor() {
    if (!env.MERCADO_LIVRE_ENABLED) {
      throw new Error(
        "MercadoLivreProvider requires MERCADO_LIVRE_ENABLED=true. See docs/MONETIZATION_SCORE.md.",
      );
    }
    if (!env.MERCADO_LIVRE_API_ENABLED) {
      throw new Error(
        "MercadoLivreProvider requires MERCADO_LIVRE_API_ENABLED=true. See docs/MONETIZATION_SCORE.md.",
      );
    }
    if (!env.MERCADO_LIVRE_ACCESS_TOKEN) {
      throw new Error(
        "MercadoLivreProvider requires MERCADO_LIVRE_ACCESS_TOKEN — register an application in " +
          "Mercado Livre's DevCenter and complete their OAuth flow first. See docs/MONETIZATION_SCORE.md.",
      );
    }
    this.siteId = env.MERCADO_LIVRE_SITE_ID;
    this.accessToken = env.MERCADO_LIVRE_ACCESS_TOKEN;
  }

  async searchProducts(_query: ProductSearchQuery): Promise<ProductSearchResult> {
    throw new NotImplementedYetError(
      "searchProducts",
      "site search's exact request/response shape was not confirmed with the same rigor as /items — see docs/MONETIZATION_SCORE.md",
    );
  }

  async getProduct(externalId: string): Promise<NormalizedProduct | null> {
    const item = await this.fetchItem(externalId);
    return item ? toNormalizedProduct(item) : null;
  }

  /**
   * GET /products/{id} — a DIFFERENT resource than GET /items/{id}, both
   * confusingly using the same "MLB..." id format. Confirmed via a real
   * highlights response (2026-09-07): /highlights returns entries with
   * `type: "PRODUCT"` (catalog-level canonical product, e.g. "Samsung
   * Galaxy A17" with variation `pickers`), not `type: "ITEM"` as first
   * assumed — GET /items/{id} 404s on these ids; GET /products/{id} is
   * the one that actually resolves them. Returns just the display name,
   * since that's all MercadoLivreBestsellerDemandSource's resolver needs.
   */
  async getCatalogProductName(productId: string): Promise<string | null> {
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      logger.error("mercado_livre.fetch_catalog_product_failed", {
        productId,
        status: response.status,
      });
      throw new Error(
        `MercadoLivreProvider.getCatalogProductName(${productId}) failed: HTTP ${response.status}`,
      );
    }
    const body = (await response.json()) as { name?: string };
    return body.name ?? null;
  }

  /**
   * Full catalog product detail — brand/model/GTIN/domain/images. Confirmed
   * live (2026-09-07) against a real highlighted product: `attributes[]`
   * carries BRAND/LINE/MODEL (GTIN present only sometimes — never assumed).
   * Used for commercial enrichment (Phase 2), not by the demand sources
   * (which only need the display name via getCatalogProductName above).
   */
  async getCatalogProductDetail(productId: string): Promise<MercadoLivreCatalogProduct | null> {
    const response = await fetch(`${API_BASE}/products/${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      logger.error("mercado_livre.fetch_catalog_product_detail_failed", {
        productId,
        status: response.status,
      });
      throw new Error(
        `MercadoLivreProvider.getCatalogProductDetail(${productId}) failed: HTTP ${response.status}`,
      );
    }
    return (await response.json()) as MercadoLivreCatalogProduct;
  }

  /**
   * GET /products/{id}/items — the real, working, API-native association
   * between a catalog product and the sellers' actual offers/listings for
   * it. Confirmed live (2026-09-07): returns real item_id/seller_id/price/
   * original_price/condition/shipping/sale_terms per offer. This is the
   * relationship itself asserted by Mercado Livre, not inferred/guessed —
   * every item returned here genuinely belongs to this catalog product.
   *
   * Deliberately NOT followed by a GET /items/{id} call per item: that
   * endpoint returned 403 PA_UNAUTHORIZED_RESULT_FROM_POLICIES for every
   * other seller's item tested (this app's own items would presumably
   * work, but there are none) — this app's current DevCenter permissions
   * don't cover reading other sellers' full item detail. Everything this
   * phase needs (price, discount, condition, shipping, seller id) is
   * already inline in this endpoint's response, so no second call is
   * needed. sold_quantity and rating/reviews are NOT available here or via
   * GET /reviews/item/{id} (also 403) — left as UNKNOWN, never guessed.
   */
  async getCatalogProductItems(productId: string): Promise<MercadoLivreCatalogItem[]> {
    const response = await fetch(
      `${API_BASE}/products/${encodeURIComponent(productId)}/items`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } },
    );
    if (response.status === 404) return [];
    if (!response.ok) {
      logger.error("mercado_livre.fetch_catalog_product_items_failed", {
        productId,
        status: response.status,
      });
      throw new Error(
        `MercadoLivreProvider.getCatalogProductItems(${productId}) failed: HTTP ${response.status}`,
      );
    }
    const body = (await response.json()) as { results: MercadoLivreCatalogItem[] };
    return body.results;
  }

  /**
   * GET /users/{sellerId} — confirmed live (2026-09-07): works for any
   * seller id (not just this app's own account), returns real
   * seller_reputation (level_id, power_seller_status, transactions.total).
   * A real, legitimate trust signal — never confused with affiliate
   * commission, which this project has no programmatic access to at all
   * (see docs/AFFILIATE_LINK_REGISTRY.md).
   */
  async getSellerReputation(sellerId: number): Promise<MercadoLivreSellerReputation | null> {
    const response = await fetch(`${API_BASE}/users/${sellerId}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      logger.error("mercado_livre.fetch_seller_reputation_failed", {
        sellerId,
        status: response.status,
      });
      throw new Error(
        `MercadoLivreProvider.getSellerReputation(${sellerId}) failed: HTTP ${response.status}`,
      );
    }
    const body = (await response.json()) as {
      nickname?: string;
      seller_reputation?: {
        level_id: string | null;
        power_seller_status: string | null;
        transactions?: { total?: number };
      };
    };
    return {
      sellerId,
      nickname: body.nickname ?? null,
      levelId: body.seller_reputation?.level_id ?? null,
      powerSellerStatus: body.seller_reputation?.power_seller_status ?? null,
      transactionsTotal: body.seller_reputation?.transactions?.total ?? null,
    };
  }

  async getProducts(externalIds: string[]): Promise<NormalizedProduct[]> {
    // GET /items/{id} is the only item-lookup shape confirmed by research;
    // a bulk `/items?ids=...` variant is commonly referenced elsewhere but
    // wasn't independently confirmed here, so this calls the single-item
    // endpoint per id rather than guess a batch response shape.
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

  private async fetchItem(itemId: string): Promise<MercadoLivreItem | null> {
    const url = `${API_BASE}/items/${encodeURIComponent(itemId)}?include_attributes=all`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      logger.error("mercado_livre.fetch_item_failed", {
        itemId,
        status: response.status,
      });
      throw new Error(
        `MercadoLivreProvider.getProduct(${itemId}) failed: HTTP ${response.status}`,
      );
    }

    return (await response.json()) as MercadoLivreItem;
  }
}

class NotImplementedYetError extends Error {
  constructor(method: string, reason: string) {
    super(`MercadoLivreProvider.${method} is not implemented: ${reason}`);
    this.name = "NotImplementedYetError";
    logger.error("provider.not_implemented", {
      provider: "MERCADO_LIVRE",
      method,
      reason,
    });
  }
}

// Shape confirmed via GET /items/{id}?include_attributes=all (2026-09-07
// research). Only the fields this provider actually reads are typed —
// intentionally not a full schema of ML's response.
interface MercadoLivreItem {
  id: string;
  title: string;
  price: number;
  currency_id: string;
  available_quantity: number;
  status: string;
  permalink: string;
  thumbnail?: string;
  attributes?: Array<{ id: string; value_name: string | null }>;
}

/** Shared by toNormalizedProduct (items) and the enrichment script
 * (catalog products) — both shapes carry the same `{id, value_name}[]`
 * attributes array. */
export function findAttribute(
  entity: { attributes?: Array<{ id: string; value_name: string | null }> },
  attributeId: string,
): string | undefined {
  return (
    entity.attributes?.find((a) => a.id === attributeId)?.value_name ?? undefined
  );
}

function toNormalizedProduct(item: MercadoLivreItem): NormalizedProduct {
  const offer: NormalizedOffer = {
    price: item.price,
    currency: item.currency_id,
    // NOT an affiliate link — see class-level doc comment.
    affiliateUrl: item.permalink,
    availability:
      item.status !== "active"
        ? "UNKNOWN"
        : item.available_quantity > 0
          ? "IN_STOCK"
          : "OUT_OF_STOCK",
    observedAt: new Date(),
  };

  return {
    asin: item.id,
    provider: "MERCADO_LIVRE",
    title: item.title,
    brand: findAttribute(item, "BRAND"),
    imageUrl: item.thumbnail,
    specifications: item.attributes
      ? Object.fromEntries(
          item.attributes
            .filter((a) => a.value_name !== null)
            .map((a) => [a.id, a.value_name as string]),
        )
      : undefined,
    offer,
  };
}

// Shapes confirmed against real live responses (2026-09-07) — only the
// fields this codebase actually reads are typed, not a full schema.

/** GET /products/{id}. `attributes` intentionally left as the raw
 * id/value_name pairs (not narrowed) — callers pick out BRAND/LINE/MODEL/
 * GTIN via findAttribute, same helper toNormalizedProduct already uses,
 * since which attributes exist varies by domain_id and isn't guessed here. */
export interface MercadoLivreCatalogProduct {
  id: string;
  name: string;
  domain_id?: string;
  family_name?: string;
  status?: string;
  pictures?: Array<{ url: string }>;
  attributes?: Array<{ id: string; value_name: string | null }>;
}

/** One entry of GET /products/{id}/items's `results[]` — a real seller
 * offer for that catalog product. `original_price` is null when there is
 * no discount (confirmed: both shapes seen live). sold_quantity is NOT
 * part of this response — never assumed present. */
export interface MercadoLivreCatalogItem {
  item_id: string;
  seller_id: number;
  price: number;
  original_price: number | null;
  currency_id: string;
  condition: string;
  category_id?: string;
  shipping?: { free_shipping?: boolean };
}

export interface MercadoLivreSellerReputation {
  sellerId: number;
  nickname: string | null;
  levelId: string | null;
  powerSellerStatus: string | null;
  transactionsTotal: number | null;
}
