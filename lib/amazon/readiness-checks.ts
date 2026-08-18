import { env } from "@/lib/config/env";
import { getAmazonMarketplaceConfig } from "@/lib/config/marketplaces";

export type ReadinessValue = "PASS" | "PENDING";

export interface ReadinessCheck {
  key: string;
  label: string;
  value: ReadinessValue;
  /** PENDING is an honest, expected state — not a technical failure
   * (Sprint 3 Part 7: "PENDING não é FAIL técnico"). It still counts as a
   * production blocker, which is a different axis from "did something
   * break". */
  pass: boolean;
}

function check(key: string, label: string, pass: boolean): ReadinessCheck {
  return { key, label, value: pass ? "PASS" : "PENDING", pass };
}

/**
 * Pure, env-driven checks shared by `npm run production:readiness` and the
 * /admin Amazon status sections — one implementation so the two can never
 * disagree. Every value here is either a real config presence check or a
 * human-set flag (AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED, etc.) — never
 * inferred from click/order counts (see docs/AMAZON.md: 13 pedidos no
 * painel BR não é o mesmo que 10 vendas qualificadas).
 */
export function getBrazilReadinessChecks(): ReadinessCheck[] {
  const config = getAmazonMarketplaceConfig("BR");
  return [
    check(
      "amazon_br_tracking_id",
      "AMAZON_BR_TRACKING_ID",
      config.associateTag.length > 0,
    ),
    check(
      "amazon_br_account_approved",
      "AMAZON_BR_ACCOUNT_APPROVED",
      env.AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED,
    ),
    check(
      "amazon_br_qualified_sales",
      "AMAZON_BR_QUALIFIED_SALES",
      env.AMAZON_BR_QUALIFIED_SALES_MET,
    ),
    check(
      "amazon_br_api_credentials",
      "AMAZON_BR_API_CREDENTIALS",
      env.AMAZON_CREATORS_API_KEY.length > 0 &&
        env.AMAZON_CREATORS_API_SECRET.length > 0,
    ),
    check(
      "amazon_br_live_provider",
      "AMAZON_BR_LIVE_PROVIDER",
      env.AMAZON_PROVIDER === "live" && config.apiEnabled,
    ),
  ];
}

export function getUsReadinessChecks(): ReadinessCheck[] {
  return [
    check(
      "amazon_us_precocaindo_registered",
      "AMAZON_US_PRECOCAINDO_REGISTERED",
      env.AMAZON_US_PRECOCAINDO_REGISTERED,
    ),
    check(
      "amazon_us_payment_configured",
      "AMAZON_US_PAYMENT_CONFIGURED",
      env.AMAZON_US_PAYMENT_CONFIGURED,
    ),
    check(
      "amazon_us_account_status",
      "AMAZON_US_ACCOUNT_STATUS",
      env.AMAZON_US_ENABLED,
    ),
    check(
      "amazon_us_api_credentials",
      "AMAZON_US_API_CREDENTIALS",
      env.AMAZON_US_API_ENABLED,
    ),
  ];
}
