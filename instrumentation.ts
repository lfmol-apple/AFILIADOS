/**
 * Runs once when a new Next.js server instance starts, before it accepts
 * requests — see docs/OPERATIONS.md. Logs only non-secret operational mode
 * flags (provider, content generation mode, catalog gate) so a VPS
 * operator can confirm a deploy came up in the intended configuration from
 * the process logs alone, without hitting any endpoint.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;

  const { logger } = await import("@/lib/observability/logger");
  const { env } = await import("@/lib/config/env");

  logger.info("app.startup", {
    nodeEnv: process.env.NODE_ENV ?? "unknown",
    amazonProvider: env.AMAZON_PROVIDER,
    contentGeneration: env.CONTENT_GENERATION,
    publicCatalogEnabled: env.PUBLIC_CATALOG_ENABLED,
    autoPublish: env.AUTO_PUBLISH,
  });
}
