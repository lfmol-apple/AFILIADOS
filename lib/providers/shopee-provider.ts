import type {
  CommerceProvider,
  NormalizedOffer,
  NormalizedProduct,
  ProductSearchQuery,
  ProductSearchResult,
} from "@/types/commerce";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * NOT implemented — and unlike MercadoLivreProvider, this is not a "pending
 * credential" situation with a known request shape. Research on 2026-09-07
 * found no public/anonymous Shopee catalog API at all: Shopee Open Platform
 * requires an approved partner application (Partner ID + Partner Key) and
 * per-request HMAC signing for every endpoint, including read-only ones —
 * there is nothing here with a confirmed shape to implement yet.
 *
 * This class exists purely so the rest of the system can depend on
 * `CommerceProvider`/`MerchantCode` today (types/commerce.ts,
 * lib/merchants/config.ts already list SHOPEE) without special-casing
 * Shopee's absence. Every method fails loudly. Do not implement real HTTP
 * calls here until a human confirms real partner credentials AND the exact,
 * current API contract — see docs/MONETIZATION_SCORE.md.
 */
export class ShopeeProvider implements CommerceProvider {
  readonly name = "SHOPEE" as const;
  readonly marketplace = "BR" as const;
  readonly capabilities = {
    search: false,
    productLookup: false,
    offers: false,
    affiliateUrl: false,
  };

  constructor() {
    if (!env.SHOPEE_ENABLED) {
      throw new Error(
        "ShopeeProvider requires SHOPEE_ENABLED=true. There is no confirmed integration yet — see docs/MONETIZATION_SCORE.md.",
      );
    }
    if (!env.SHOPEE_API_ENABLED || !env.SHOPEE_PARTNER_ID || !env.SHOPEE_PARTNER_KEY) {
      throw new Error(
        "ShopeeProvider requires SHOPEE_API_ENABLED=true plus SHOPEE_PARTNER_ID/SHOPEE_PARTNER_KEY — " +
          "none of which have a confirmed real value yet. See docs/MONETIZATION_SCORE.md.",
      );
    }
    // Reachable only once the guards above pass, which today they never
    // can (no confirmed credential shape) — the throw below documents
    // that this is a deliberate stop, not a forgotten TODO.
    throw new NotConfiguredError();
  }

  async searchProducts(_query: ProductSearchQuery): Promise<ProductSearchResult> {
    throw new NotConfiguredError();
  }

  async getProduct(_externalId: string): Promise<NormalizedProduct | null> {
    throw new NotConfiguredError();
  }

  async getProducts(_externalIds: string[]): Promise<NormalizedProduct[]> {
    throw new NotConfiguredError();
  }

  async getOffers(
    _externalIds: string[],
  ): Promise<Record<string, NormalizedOffer | null>> {
    throw new NotConfiguredError();
  }
}

class NotConfiguredError extends Error {
  constructor() {
    super(
      "ShopeeProvider has no confirmed official integration (Open Platform requires an approved " +
        "partner application and per-request signing — see docs/MONETIZATION_SCORE.md). NOT_CONFIGURED.",
    );
    this.name = "NotConfiguredError";
    logger.error("provider.not_configured", { provider: "SHOPEE" });
  }
}
