import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export class MetaAdsNotConfiguredError extends Error {}

export interface DailySpend {
  /** YYYY-MM-DD, as Meta's Insights API reports it. */
  date: string;
  spendBrl: number;
  /** Meta's own ad-level impressions/clicks — owner's authorization,
   * 2026-11-19, "Indicadores de rentabilidade": real CTR needs real
   * impressions, which only Meta's API has (never estimated). Null when
   * the API genuinely returns nothing for that day — never defaulted to
   * 0, same "missing ≠ zero" rule as spend. */
  impressions: number | null;
  metaClicks: number | null;
}

/**
 * Real daily ad spend from Meta's own Marketing API Insights endpoint
 * (/act_{id}/insights) — confirmed via research 2026-11-19: a System User
 * long-lived token for Henrique's OWN ad account needs only Standard
 * access (ads_read), no App Review (that's only required to manage OTHER
 * businesses' accounts), and such a token does not expire on its own.
 *
 * Never estimates or interpolates — a day Meta's API doesn't return (no
 * spend, or the campaign didn't exist yet) is simply absent from the
 * result, same "missing ≠ zero" rule as everywhere else in this module's
 * financial code.
 */
export async function fetchDailyAdSpend(input: {
  since: Date;
  until: Date;
}): Promise<DailySpend[]> {
  if (!env.META_ACCESS_TOKEN || !env.META_AD_ACCOUNT_ID) {
    throw new MetaAdsNotConfiguredError(
      "META_ACCESS_TOKEN/META_AD_ACCOUNT_ID not configured — ad spend import is disabled.",
    );
  }

  const params = new URLSearchParams({
    access_token: env.META_ACCESS_TOKEN,
    level: "campaign",
    time_increment: "1",
    fields: "spend,date_start,impressions,clicks",
    time_range: JSON.stringify({
      since: input.since.toISOString().slice(0, 10),
      until: input.until.toISOString().slice(0, 10),
    }),
  });
  if (env.META_VITRINE_CAMPAIGN_ID) {
    params.set("filtering", JSON.stringify([
      { field: "campaign.id", operator: "EQUAL", value: env.META_VITRINE_CAMPAIGN_ID },
    ]));
  }

  const response = await fetch(`${GRAPH_API_BASE}/act_${env.META_AD_ACCOUNT_ID}/insights?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.error("meta_ads_insights.failed", { status: response.status, body: body.slice(0, 500) });
    throw new Error(`Meta Insights API failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ spend?: string; date_start?: string; impressions?: string; clicks?: string }>;
  };
  return (payload.data ?? [])
    .filter((row): row is { spend: string; date_start: string; impressions?: string; clicks?: string } =>
      Boolean(row.spend && row.date_start),
    )
    .map((row) => ({
      date: row.date_start,
      spendBrl: Number(row.spend),
      impressions: row.impressions !== undefined ? Number(row.impressions) : null,
      metaClicks: row.clicks !== undefined ? Number(row.clicks) : null,
    }));
}
