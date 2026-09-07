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

function findAttribute(
  item: MercadoLivreItem,
  attributeId: string,
): string | undefined {
  return (
    item.attributes?.find((a) => a.id === attributeId)?.value_name ?? undefined
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
