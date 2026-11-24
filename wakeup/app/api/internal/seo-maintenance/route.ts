import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { ensurePublicSlugsForAllEligibleListings } from "@/lib/queries/public-product";
import { logger } from "@/lib/observability/logger";

/**
 * Periodic catch-up so everything the owner registers reaches Google without
 * a manual step: gives every eligible listing that still has no public page a
 * slug (idempotent — it never regenerates an existing one), which is what
 * puts a page into the sitemap. Saving a link already does this for that one
 * listing (lib/services/affiliate-link-registry.ts); this run covers anything
 * that path missed (a failure, a link created by a script, a listing that only
 * became eligible later).
 *
 * Called by the VPS crontab through scripts/run-seo-maintenance-cron.sh with
 * `x-cron-secret`. Disabled (404) when CRON_SECRET is not configured, and it
 * lives under /api/, which robots.txt already disallows.
 */
function secretMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!secretMatches(request.headers.get("x-cron-secret"), env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const summary = await ensurePublicSlugsForAllEligibleListings();
  logger.info("seo_maintenance.done", {
    ...summary,
    ms: Date.now() - startedAt,
  });
  return NextResponse.json({
    ok: true,
    ...summary,
    ms: Date.now() - startedAt,
  });
}
