import { env } from "@/lib/config/env";
import {
  getAmazonMarketplaceConfig,
  AMAZON_STORE_IDS,
} from "@/lib/config/marketplaces";

export interface BrazilAmazonStatus {
  storeId: string;
  trackingId: string;
  trackingIdConfigured: boolean;
  creatorsApiAccountApproved: boolean;
  qualifiedSalesRequirementMet: boolean;
  apiEnabled: boolean;
  provider: "mock" | "live";
}

export interface UsAmazonStatus {
  storeId: string;
  precoCaindoRegistered: boolean;
  paymentConfigured: boolean;
  apiEnabled: boolean;
  operationalOnPrecoCaindo: boolean;
}

/** Never includes an actual key/secret/token value — only booleans and
 * public identifiers (Store IDs, tracking tags are not secrets; they
 * appear in every outbound affiliate URL). See project brief Sprint 2 Part
 * W / Sprint 3 Part 6: "Nunca mostrar API secret/key". */
export function getBrazilAmazonStatus(): BrazilAmazonStatus {
  const config = getAmazonMarketplaceConfig("BR");
  return {
    storeId: AMAZON_STORE_IDS.BR,
    trackingId: config.associateTag || "(não configurado)",
    trackingIdConfigured: config.associateTag.length > 0,
    creatorsApiAccountApproved: env.AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED,
    qualifiedSalesRequirementMet: env.AMAZON_BR_QUALIFIED_SALES_MET,
    apiEnabled: config.apiEnabled,
    provider: env.AMAZON_PROVIDER,
  };
}

export function getUsAmazonStatus(): UsAmazonStatus {
  const config = getAmazonMarketplaceConfig("US");
  return {
    storeId: AMAZON_STORE_IDS.US,
    precoCaindoRegistered: env.AMAZON_US_PRECOCAINDO_REGISTERED,
    paymentConfigured: env.AMAZON_US_PAYMENT_CONFIGURED,
    apiEnabled: config.apiEnabled,
    operationalOnPrecoCaindo: config.enabled,
  };
}
