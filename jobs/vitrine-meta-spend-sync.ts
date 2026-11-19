import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { fetchDailyAdSpend, MetaAdsNotConfiguredError } from "@/lib/services/meta-ads-insights";

/**
 * Vitrine Inteligente Fase 3 — daily real ad-spend import (owner's
 * request, 2026-11-19: reduce manual entry). Pulls the last 3 days from
 * Meta's own Insights API every run (not just "yesterday") because Meta's
 * reported spend can still adjust for a day or two after it ends — an
 * upsert on (spentOn, source="meta_api") means a revised figure simply
 * overwrites the earlier one, never creates a duplicate.
 *
 * A no-op, not a failure, when META_ACCESS_TOKEN/META_AD_ACCOUNT_ID
 * aren't set yet (feature genuinely not configured) — the manual form in
 * /admin/vitrine-financeiro keeps working as the fallback either way.
 */
export async function runVitrineMetaSpendSyncJob() {
  return runJob("VITRINE_META_SPEND_SYNC", async (ctx) => {
    const until = new Date();
    const since = new Date(until.getTime() - 3 * 24 * 60 * 60 * 1000);

    let spends;
    try {
      spends = await fetchDailyAdSpend({ since, until });
    } catch (err) {
      if (err instanceof MetaAdsNotConfiguredError) {
        ctx.metadata.skipped = "not_configured";
        return;
      }
      throw err;
    }

    for (const day of spends) {
      await prisma.vitrineAdSpend.upsert({
        where: { spentOn_source: { spentOn: new Date(day.date), source: "meta_api" } },
        create: {
          spentOn: new Date(day.date),
          amountBrl: day.spendBrl,
          source: "meta_api",
          note: "Importado automaticamente via Meta Insights API",
          impressions: day.impressions,
          metaClicks: day.metaClicks,
        },
        update: { amountBrl: day.spendBrl, impressions: day.impressions, metaClicks: day.metaClicks },
      });
      ctx.counters.updated += 1;
    }
    ctx.counters.processed = spends.length;
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runVitrineMetaSpendSyncJob()
    .then((counters) => {
      console.log("VITRINE_META_SPEND_SYNC done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("VITRINE_META_SPEND_SYNC failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
