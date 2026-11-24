import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import {
  getBrazilReadinessChecks,
  getUsReadinessChecks,
} from "@/lib/amazon/readiness-checks";
import { isPublicCatalogSafeToShow, isMockDataPubliclyHidden } from "@/lib/config/public-catalog";
import { isAdminAuthConfigured } from "@/lib/admin/auth";

/**
 * Evaluates what can honestly be evaluated automatically. Deliberately does
 * NOT try to make every line say PASS by inventing configuration (project
 * brief: "NÃO tente transformar tudo em PASS inventando configuração") —
 * the BR/US Amazon checks in particular are expected to read PENDING until
 * a human actually confirms account approval, qualified sales, US
 * registration and payment with Amazon directly. PENDING is not a
 * technical failure.
 *
 * Three separate verdicts, each a superset of blockers of the one before it
 * (project brief Sprint 5 section 1 — this replaces the old two-verdict
 * BR_LAUNCH_READY/PRODUCTION split, which incorrectly made an institutional
 * pre-launch site wait on PUBLIC_CATALOG_SAFE):
 *
 * - SITE_LAUNCH_READY: precocaindo.com.br can receive real traffic in
 *   institutional/pre-launch mode. Blocked only by DATABASE_READY,
 *   INFRASTRUCTURE_READY, ADMIN_SECURED, DOMAIN_CONFIGURED,
 *   MOCK_DATA_PUBLICLY_HIDDEN, and AMAZON_BR_TRACKING_ID. Never requires the
 *   public catalog to actually be turned on, never requires Amazon API
 *   access, never requires qualified sales, never depends on US.
 * - CATALOG_LAUNCH_READY: the public catalog itself can be shown.
 *   Additionally blocked by PUBLIC_CATALOG_SAFE and REAL_CATALOG_AVAILABLE.
 * - PRODUCTION: fully live selling through the real Amazon BR Creators API.
 *   Additionally blocked by AMAZON_BR_ACCOUNT_APPROVED,
 *   AMAZON_BR_QUALIFIED_SALES, AMAZON_BR_API_CREDENTIALS and
 *   AMAZON_BR_LIVE_PROVIDER.
 *
 * No verdict is ever blocked by an AMAZON_US_* line — "pendências dos EUA
 * NÃO devem impedir precocaindo.com.br de lançar no Brasil." The US checks
 * are printed for visibility only. See tests/production-readiness.test.ts.
 */

export type ReadinessGroup = "site" | "catalog" | "production" | "us";

export interface Line {
  group: ReadinessGroup;
  label: string;
  value: string;
  blocksSiteLaunch: boolean;
  blocksCatalogLaunch: boolean;
  blocksProduction: boolean;
}

export interface ReadinessReport {
  lines: Line[];
  siteLaunchReady: boolean;
  catalogLaunchReady: boolean;
  productionReady: boolean;
}

export interface ReadinessOptions {
  /**
   * Result of the test suite, computed by the caller. Defaults to true so
   * buildReadinessReport() never has to spawn a nested `vitest run` itself
   * — the CLI script (scripts/production-readiness.ts) runs the suite and
   * passes the result in; tests of this module pass a fixed boolean.
   */
  infrastructureReady?: boolean;
}

function line(
  group: ReadinessGroup,
  label: string,
  value: string,
  opts: { blocksSiteLaunch?: boolean; blocksCatalogLaunch?: boolean; blocksProduction?: boolean } = {},
): Line {
  const blocksSiteLaunch = opts.blocksSiteLaunch ?? false;
  const blocksCatalogLaunch = blocksSiteLaunch || (opts.blocksCatalogLaunch ?? false);
  const blocksProduction = blocksCatalogLaunch || (opts.blocksProduction ?? false);
  return { group, label, value, blocksSiteLaunch, blocksCatalogLaunch, blocksProduction };
}

async function checkDatabaseReady(): Promise<Line> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return line("site", "DATABASE_READY", "FAIL (no connection)", { blocksSiteLaunch: true });
  }

  try {
    const output = execSync("npx prisma migrate status", {
      encoding: "utf8",
      stdio: "pipe",
    });
    const upToDate =
      /up to date/i.test(output) || /no pending migrations/i.test(output);
    return upToDate
      ? line("site", "DATABASE_READY", "PASS")
      : line("site", "DATABASE_READY", "FAIL (pending migrations)", { blocksSiteLaunch: true });
  } catch {
    return line("site", "DATABASE_READY", "FAIL (migrate status errored)", { blocksSiteLaunch: true });
  }
}

function checkInfrastructureReady(infrastructureReady: boolean): Line {
  return infrastructureReady
    ? line("site", "INFRASTRUCTURE_READY", "PASS (tests green)")
    : line("site", "INFRASTRUCTURE_READY", "FAIL (tests red)", { blocksSiteLaunch: true });
}

/** Matches lib/admin/auth.ts's isAdminRequestAuthorized() exactly: a
 * missing ADMIN_PASSWORD_HASH is only acceptable outside production. */
function checkAdminSecured(): Line {
  if (isAdminAuthConfigured()) {
    return line("site", "ADMIN_SECURED", "PASS (session auth configured)");
  }
  const acceptable = process.env.NODE_ENV !== "production";
  return acceptable
    ? line("site", "ADMIN_SECURED", "PENDING (dev mode, no password set)", { blocksSiteLaunch: true })
    : line("site", "ADMIN_SECURED", "FAIL (no ADMIN_PASSWORD_HASH in production)", {
        blocksSiteLaunch: true,
      });
}

function checkDomainConfigured(): Line {
  const deployed = env.NEXT_PUBLIC_SITE_URL === "https://precocaindo.com.br";
  return deployed
    ? line("site", "DOMAIN_CONFIGURED", "PASS (precocaindo.com.br)")
    : line("site", "DOMAIN_CONFIGURED", `FAIL (${env.NEXT_PUBLIC_SITE_URL})`, { blocksSiteLaunch: true });
}

function checkMockDataPubliclyHidden(): Line {
  const hidden = isMockDataPubliclyHidden();
  return hidden
    ? line("site", "MOCK_DATA_PUBLICLY_HIDDEN", "PASS")
    : line("site", "MOCK_DATA_PUBLICLY_HIDDEN", "FAIL (mock catalog would be publicly visible)", {
        blocksSiteLaunch: true,
      });
}

function checkPublicCatalogSafe(): Line {
  const safe = isPublicCatalogSafeToShow();
  // Not safe is a legitimate, honest pre-launch state, not a bug — it only
  // blocks CATALOG_LAUNCH_READY (showing the catalog), never
  // SITE_LAUNCH_READY (the site existing at all in institutional mode).
  return safe
    ? line("catalog", "PUBLIC_CATALOG_SAFE", "PASS (safe to show)")
    : line("catalog", "PUBLIC_CATALOG_SAFE", "PENDING (pre-launch / catalog withheld)", {
        blocksCatalogLaunch: true,
      });
}

async function checkRealCatalogAvailable(): Promise<Line> {
  const productsWithStats = await prisma.product.count({
    where: { marketplace: "BR", active: true, priceStats: { isNot: null } },
  });
  const isLive = env.AMAZON_PROVIDER === "live";
  const available = isLive && productsWithStats > 0;
  const detail = isLive
    ? `${productsWithStats} BR product(s) with real data`
    : `AMAZON_PROVIDER=mock (${productsWithStats} staged/demo product(s), not real)`;
  return available
    ? line("catalog", "REAL_CATALOG_AVAILABLE", `PASS (${detail})`)
    : line("catalog", "REAL_CATALOG_AVAILABLE", `PENDING (${detail})`, { blocksCatalogLaunch: true });
}

function checkAmazonProvider(): Line {
  return line("site", "AMAZON_PROVIDER", env.AMAZON_PROVIDER.toUpperCase());
}

function checkAutoPublish(): Line {
  return line("site", "AUTO_PUBLISH", env.AUTO_PUBLISH ? "ON" : "OFF");
}

/** BR checks map straight to Line. Only AMAZON_BR_TRACKING_ID blocks
 * SITE_LAUNCH_READY (a link with no tag can't be built at all). The other
 * four (account approval, qualified sales, API credentials, live provider)
 * are about actually transacting live through the real Amazon API —
 * required for the PRODUCTION verdict only. */
function brazilChecksToLines(
  checks: ReturnType<typeof getBrazilReadinessChecks>,
): Line[] {
  return checks.map((c) =>
    line("site", c.label, c.value, {
      blocksSiteLaunch: c.key === "amazon_br_tracking_id" && !c.pass,
      blocksProduction: c.key !== "amazon_br_tracking_id" && !c.pass,
    }),
  );
}

/** US checks are informational only — never block any verdict, since
 * precocaindo.com.br is a BR-only site today. */
function usChecksToLines(checks: ReturnType<typeof getUsReadinessChecks>): Line[] {
  return checks.map((c) => line("us", c.label, `${c.value} (informational, does not block BR)`));
}

export async function buildReadinessReport(
  options: ReadinessOptions = {},
): Promise<ReadinessReport> {
  const { infrastructureReady = true } = options;

  const brazilChecks = getBrazilReadinessChecks();
  const trackingIdLine = brazilChecksToLines(
    brazilChecks.filter((c) => c.key === "amazon_br_tracking_id"),
  );
  const productionOnlyBrazilLines = brazilChecksToLines(
    brazilChecks.filter((c) => c.key !== "amazon_br_tracking_id"),
  ).map((l) => ({ ...l, group: "production" as const }));

  const lines: Line[] = [
    await checkDatabaseReady(),
    checkInfrastructureReady(infrastructureReady),
    checkAdminSecured(),
    checkDomainConfigured(),
    checkMockDataPubliclyHidden(),
    checkAmazonProvider(),
    checkAutoPublish(),
    ...trackingIdLine,
    checkPublicCatalogSafe(),
    await checkRealCatalogAvailable(),
    ...productionOnlyBrazilLines,
    ...usChecksToLines(getUsReadinessChecks()),
  ];

  const siteLaunchReady = lines.every((l) => !l.blocksSiteLaunch);
  const catalogLaunchReady = lines.every((l) => !l.blocksCatalogLaunch);
  const productionReady = lines.every((l) => !l.blocksProduction);

  return { lines, siteLaunchReady, catalogLaunchReady, productionReady };
}
