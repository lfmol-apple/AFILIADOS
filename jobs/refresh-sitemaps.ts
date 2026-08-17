import { runJob } from "@/lib/jobs/automation-run";

/**
 * Sitemaps are served dynamically from the database by app/sitemap.ts on
 * every request (Next.js App Router convention), so there is no static file
 * to regenerate today. This job exists as a placeholder AutomationRun entry
 * and as the hook point for when sitemap output moves to a cached/ISR
 * strategy that needs explicit invalidation.
 */
export async function refreshSitemaps() {
  return runJob("REFRESH_SITEMAPS", async (ctx) => {
    ctx.metadata.note = "Sitemap is generated dynamically at request time; nothing to refresh.";
  });
}
