import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { runJob, type JobCounters } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";
import {
  buildTelegramMessage,
  buildTelegramPostCandidate,
  type TelegramPostCandidate,
} from "@/lib/services/price-drop-digest";
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/services/telegram-sender";

/** How many real price drops to post per run — deliberately small (owner's
 * brief, 2026-11-10: "menos volume, mais prova" is the channel's whole
 * differentiation from the giant generic promo channels it competes
 * against). Posting everything that qualifies would just be noise. */
const MAX_POSTS_PER_RUN = 5;

/** How many ACTIVE-linked, not-yet-posted listings to pull per run before
 * ranking — a pool, not the whole catalog, so this job stays cheap on a
 * schedule. Ordered by most recently refreshed first (lib/jobs/ml-refresh-
 * linked.ts and the Shopee jobs both touch updatedAt), so the pool is
 * biased toward listings whose price data is actually fresh. */
const CANDIDATE_POOL_SIZE = 300;

interface CandidateRow {
  id: string;
}

async function loadCandidatePool(): Promise<CandidateRow[]> {
  return prisma.$queryRaw<CandidateRow[]>`
    SELECT ml.id
    FROM "MerchantListing" ml
    JOIN "Merchant" m ON m.id = ml."merchantId"
    JOIN "AffiliateLinkRegistry" alr
      ON alr."merchantListingId" = ml.id AND alr.status = 'ACTIVE'
    WHERE ml.active = true
      AND m.code IN ('MERCADO_LIVRE', 'SHOPEE')
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'mercado_livre_catalog_items'
      )
      AND NOT EXISTS (
        SELECT 1 FROM "MerchantListingSignal" s
        WHERE s."merchantListingId" = ml.id AND s.source = 'telegram_posted'
      )
    ORDER BY ml."updatedAt" DESC
    LIMIT ${CANDIDATE_POOL_SIZE}
  `;
}

async function markAsPosted(merchantListingId: string): Promise<void> {
  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId,
      source: "telegram_posted",
      raw: { postedAt: new Date().toISOString() },
    },
  });
}

/**
 * Picks real price-drop candidates from the ACTIVE-linked catalog (never
 * ML_DEMAND-style rediscovery — same closed-set principle as
 * jobs/ml-refresh-linked.ts) and posts the best few to the owner's
 * Telegram channel. dryRun defaults to true, same convention as
 * jobs/daily-performance-digest.ts and LINK_HEALTH_CHECK.
 */
export async function runTelegramDigestJob(dryRun: boolean): Promise<JobCounters> {
  return runJob("TELEGRAM_DIGEST", async (ctx) => {
    const pool = await loadCandidatePool();
    ctx.metadata.poolSize = pool.length;

    const candidates: TelegramPostCandidate[] = [];
    for (const row of pool) {
      try {
        const facts = await loadMerchantListingFactsByListingId(row.id);
        if (!facts) continue;
        const candidate = buildTelegramPostCandidate(facts);
        if (candidate) candidates.push(candidate);
      } catch (err) {
        logger.warn("telegram_digest.facts_failed", {
          merchantListingId: row.id,
          message: String(err),
        });
      }
    }
    ctx.counters.processed = pool.length;
    ctx.metadata.realDropsFound = candidates.length;

    candidates.sort((a, b) => b.dropPercent - a.dropPercent);
    const chosen = candidates.slice(0, MAX_POSTS_PER_RUN);

    const posted: Array<{ title: string; dropPercent: number }> = [];
    for (const candidate of chosen) {
      const text = buildTelegramMessage(candidate, env.NEXT_PUBLIC_SITE_URL);

      if (dryRun) {
        console.log(`--- (dry-run, não marcado como postado) ---\n${text}\n`);
        posted.push({ title: candidate.title, dropPercent: candidate.dropPercent });
        continue;
      }

      if (!isTelegramConfigured()) {
        ctx.counters.errors += 1;
        logger.error("telegram_digest.not_configured", {
          message: "TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID must both be set.",
        });
        break;
      }

      try {
        await sendTelegramMessage(text);
        await markAsPosted(candidate.merchantListingId);
        ctx.counters.created += 1;
        posted.push({ title: candidate.title, dropPercent: candidate.dropPercent });
      } catch (err) {
        ctx.counters.errors += 1;
        logger.error("telegram_digest.send_failed", {
          merchantListingId: candidate.merchantListingId,
          message: String(err),
        });
      }
    }
    ctx.metadata.posted = posted;
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const { values } = parseArgs({
    options: { live: { type: "boolean", default: false } },
  });
  const dryRun = !values.live;
  if (dryRun) {
    console.log("=== DRY RUN — nada será postado. Passe --live pra enviar. ===");
  }
  runTelegramDigestJob(dryRun)
    .then((c) => console.log("TELEGRAM_DIGEST done:", JSON.stringify(c)))
    .catch((err) => {
      console.error("TELEGRAM_DIGEST failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
