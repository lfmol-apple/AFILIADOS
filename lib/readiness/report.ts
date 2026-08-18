import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import {
  getBrazilReadinessChecks,
  getUsReadinessChecks,
} from "@/lib/amazon/readiness-checks";
import { isPublicCatalogSafeToShow } from "@/lib/config/public-catalog";

/**
 * Evaluates what can honestly be evaluated automatically. Deliberately does
 * NOT try to make every line say PASS by inventing configuration (project
 * brief: "NÃO tente transformar tudo em PASS inventando configuração") —
 * the BR/US Amazon checks in particular are expected to read PENDING until
 * a human actually confirms account approval, qualified sales, US
 * registration and payment with Amazon directly. PENDING is not a
 * technical failure.
 *
 * Two separate verdicts (project brief Sprint 4 section 13):
 *
 * - BR_LAUNCH_READY: everything needed to put precocaindo.com.br online in
 *   Brasil TODAY, in whatever mode (institutional pre-launch, or live once
 *   the Amazon BR tracking ID is wired up). Blocked only by
 *   DATABASE_READY, INFRASTRUCTURE_READY, ADMIN_SECURED, DOMAIN_CONFIGURED,
 *   PUBLIC_CATALOG_SAFE, and AMAZON_BR_TRACKING_ID.
 * - PRODUCTION: fully live selling with the real Amazon BR Creators API —
 *   additionally blocked by AMAZON_BR_ACCOUNT_APPROVED,
 *   AMAZON_BR_QUALIFIED_SALES, AMAZON_BR_API_CREDENTIALS and
 *   AMAZON_BR_LIVE_PROVIDER.
 *
 * Neither verdict is ever blocked by a US_* line — "pendências dos EUA NÃO
 * devem impedir precocaindo.com.br de lançar no Brasil." The US checks are
 * printed for visibility only. See tests/production-readiness.test.ts.
 */

export interface Line {
  label: string;
  value: string;
  /** Blocks BR_LAUNCH_READY: the minimal set needed to put the BR site
   * online at all (institutional or live). */
  blocksBrLaunch: boolean;
  /** Blocks PRODUCTION: fully live selling with the real Amazon BR API.
   * Every BR_LAUNCH_READY blocker also blocks PRODUCTION. */
  blocksProduction: boolean;
}

export interface ReadinessReport {
  lines: Line[];
  brLaunchReady: boolean;
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
  label: string,
  value: string,
  opts: { blocksBrLaunch?: boolean; blocksProduction?: boolean } = {},
): Line {
  const blocksBrLaunch = opts.blocksBrLaunch ?? false;
  return {
    label,
    value,
    blocksBrLaunch,
    blocksProduction: blocksBrLaunch || (opts.blocksProduction ?? false),
  };
}

async function checkDatabaseReady(): Promise<Line> {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return line("DATABASE_READY", "FAIL (no connection)", { blocksBrLaunch: true });
  }

  try {
    const output = execSync("npx prisma migrate status", {
      encoding: "utf8",
      stdio: "pipe",
    });
    const upToDate =
      /up to date/i.test(output) || /no pending migrations/i.test(output);
    return upToDate
      ? line("DATABASE_READY", "PASS")
      : line("DATABASE_READY", "FAIL (pending migrations)", { blocksBrLaunch: true });
  } catch {
    return line("DATABASE_READY", "FAIL (migrate status errored)", { blocksBrLaunch: true });
  }
}

function checkInfrastructureReady(infrastructureReady: boolean): Line {
  return infrastructureReady
    ? line("INFRASTRUCTURE_READY", "PASS (tests green)")
    : line("INFRASTRUCTURE_READY", "FAIL (tests red)", { blocksBrLaunch: true });
}

function checkAdminSecured(): Line {
  const protectedAdmin = env.ADMIN_ACCESS_TOKEN.length > 0;
  return protectedAdmin
    ? line("ADMIN_SECURED", "PASS (token set)")
    : line("ADMIN_SECURED", "FAIL (dev-only, no token)", { blocksBrLaunch: true });
}

function checkDomainConfigured(): Line {
  const deployed = env.NEXT_PUBLIC_SITE_URL === "https://precocaindo.com.br";
  return deployed
    ? line("DOMAIN_CONFIGURED", "PASS (precocaindo.com.br)")
    : line("DOMAIN_CONFIGURED", `FAIL (${env.NEXT_PUBLIC_SITE_URL})`, { blocksBrLaunch: true });
}

function checkPublicCatalogSafe(): Line {
  const safe = isPublicCatalogSafeToShow();
  // Not safe is a legitimate, honest pre-launch state, not a bug — but it
  // does mean the catalog isn't live, so it still blocks BR_LAUNCH_READY
  // (which is specifically about the site being able to go live with real
  // functioning pages, not just an institutional shell).
  return safe
    ? line("PUBLIC_CATALOG_SAFE", "PASS (safe to show)")
    : line("PUBLIC_CATALOG_SAFE", "PENDING (pre-launch / catalog withheld)", {
        blocksBrLaunch: true,
      });
}

function checkAmazonProvider(): Line {
  return line("AMAZON_PROVIDER", env.AMAZON_PROVIDER.toUpperCase());
}

function checkAutoPublish(): Line {
  return line("AUTO_PUBLISH", env.AUTO_PUBLISH ? "ON" : "OFF");
}

async function checkCatalogContent(): Promise<Line> {
  const productsWithStats = await prisma.product.count({
    where: { marketplace: "BR", active: true, priceStats: { isNot: null } },
  });
  // Informational only — a pre-launch deploy with zero catalog content is
  // expected and must not block anything by itself; PUBLIC_CATALOG_SAFE is
  // what actually gates whether that content (if any) is shown.
  return line(
    "CATALOG_CONTENT_BR",
    productsWithStats > 0 ? `PASS (${productsWithStats} products)` : "EMPTY",
  );
}

/** BR checks map straight to Line, tagged per project brief section 13:
 * only AMAZON_BR_TRACKING_ID blocks BR_LAUNCH_READY. The other four
 * (account approval, qualified sales, API credentials, live provider) are
 * about actually transacting live through the real Amazon API — required
 * for the PRODUCTION verdict, not for putting the BR site online. */
function brazilChecksToLines(
  checks: ReturnType<typeof getBrazilReadinessChecks>,
): Line[] {
  return checks.map((c) =>
    line(c.label, c.value, {
      blocksBrLaunch: c.key === "amazon_br_tracking_id" && !c.pass,
      blocksProduction: !c.pass,
    }),
  );
}

/** US checks are informational only — never block BR_LAUNCH_READY or
 * PRODUCTION, since precocaindo.com.br is a BR-only site today. */
function usChecksToLines(checks: ReturnType<typeof getUsReadinessChecks>): Line[] {
  return checks.map((c) => line(c.label, `${c.value} (informational, does not block BR)`));
}

export async function buildReadinessReport(
  options: ReadinessOptions = {},
): Promise<ReadinessReport> {
  const { infrastructureReady = true } = options;

  const lines: Line[] = [
    await checkDatabaseReady(),
    checkInfrastructureReady(infrastructureReady),
    checkAdminSecured(),
    checkDomainConfigured(),
    checkPublicCatalogSafe(),
    checkAmazonProvider(),
    checkAutoPublish(),
    await checkCatalogContent(),
    ...brazilChecksToLines(getBrazilReadinessChecks()),
    ...usChecksToLines(getUsReadinessChecks()),
  ];

  const brLaunchReady = lines.every((l) => !l.blocksBrLaunch);
  const productionReady = lines.every((l) => !l.blocksProduction);

  return { lines, brLaunchReady, productionReady };
}
