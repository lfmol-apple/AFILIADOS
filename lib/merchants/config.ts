import { buildAmazonProductUrl, isValidAsin } from "@/lib/amazon/policy-guard";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";
import type { MarketplaceCode } from "@/types/marketplace";

export type MerchantCode =
  "amazon" | "mercado-livre" | "shopee" | "awin" | "generic-affiliate";

export type MerchantStatus = "live" | "prepared";

export interface MerchantPublicConfig {
  code: MerchantCode;
  name: string;
  status: MerchantStatus;
  allowedHosts: string[];
  affiliateEnabled: boolean;
}

const MERCHANTS: Record<MerchantCode, MerchantPublicConfig> = {
  amazon: {
    code: "amazon",
    name: "Amazon",
    status: "live",
    allowedHosts: [
      "amazon.com.br",
      "www.amazon.com.br",
      "amazon.com",
      "www.amazon.com",
    ],
    affiliateEnabled: true,
  },
  "mercado-livre": {
    code: "mercado-livre",
    name: "Mercado Livre",
    status: "prepared",
    allowedHosts: ["mercadolivre.com.br", "www.mercadolivre.com.br"],
    affiliateEnabled: false,
  },
  shopee: {
    code: "shopee",
    name: "Shopee",
    status: "prepared",
    allowedHosts: ["shopee.com.br", "www.shopee.com.br"],
    affiliateEnabled: false,
  },
  awin: {
    code: "awin",
    name: "AWIN",
    status: "prepared",
    allowedHosts: [],
    affiliateEnabled: false,
  },
  "generic-affiliate": {
    code: "generic-affiliate",
    name: "Parceiro",
    status: "prepared",
    allowedHosts: [],
    affiliateEnabled: false,
  },
};

export class MerchantRoutingError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404,
  ) {
    super(message);
  }
}

export function isMerchantCode(value: string): value is MerchantCode {
  return Object.prototype.hasOwnProperty.call(MERCHANTS, value);
}

export function getMerchantConfig(code: MerchantCode): MerchantPublicConfig {
  return MERCHANTS[code];
}

export function listMerchantConfigs(): MerchantPublicConfig[] {
  return Object.values(MERCHANTS);
}

export function assertAllowedMerchantDestination(
  rawUrl: string,
  merchant: MerchantCode,
): URL {
  const config = getMerchantConfig(merchant);
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new MerchantRoutingError("URL comercial inválida.", 400);
  }

  if (url.protocol !== "https:") {
    throw new MerchantRoutingError(
      "Destino comercial precisa usar https.",
      400,
    );
  }
  if (!config.allowedHosts.includes(url.hostname)) {
    throw new MerchantRoutingError("Destino comercial não autorizado.", 404);
  }
  return url;
}

export function buildMerchantAffiliateUrl(input: {
  merchant: MerchantCode;
  externalId: string;
  marketplace?: MarketplaceCode;
}): string {
  if (input.merchant !== "amazon") {
    throw new MerchantRoutingError(
      `Merchant ${input.merchant} ainda não possui integração legítima habilitada.`,
      404,
    );
  }

  const marketplace = input.marketplace ?? "BR";
  if (!isValidAsin(input.externalId)) {
    throw new MerchantRoutingError(`ASIN inválido: ${input.externalId}`, 400);
  }

  const config = getAmazonMarketplaceConfig(marketplace);
  if (!config.enabled || !config.associateTag) {
    throw new MerchantRoutingError(
      `Amazon ${marketplace} ainda não está configurada para Links Especiais.`,
      404,
    );
  }

  return buildAmazonProductUrl(input.externalId, marketplace);
}
