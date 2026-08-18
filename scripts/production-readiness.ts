import "dotenv/config";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import {
  getBrazilReadinessChecks,
  getUsReadinessChecks,
} from "@/lib/amazon/readiness-checks";

/**
 * Evaluates what can honestly be evaluated automatically and prints a
 * PASS/FAIL/PENDING report. Deliberately does NOT try to make every line
 * say PASS by inventing configuration (project brief: "NÃO tente
 * transformar tudo em PASS inventando configuração") — the BR/US Amazon
 * checks in particular are expected to read PENDING until a human actually
 * confirms account approval, qualified sales, US registration and payment
 * with Amazon directly. PENDING is not a technical failure.
 */

interface Line {
  label: string;
  value: string;
  blocksProduction: boolean;
}

async function checkDatabase(): Promise<Line> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { label: "DATABASE", value: "PASS", blocksProduction: false };
  } catch {
    return { label: "DATABASE", value: "FAIL", blocksProduction: true };
  }
}

function checkMigrations(): Line {
  try {
    const output = execSync("npx prisma migrate status", {
      encoding: "utf8",
      stdio: "pipe",
    });
    const upToDate =
      /up to date/i.test(output) || /no pending migrations/i.test(output);
    return {
      label: "MIGRATIONS",
      value: upToDate ? "PASS" : "FAIL",
      blocksProduction: !upToDate,
    };
  } catch {
    return { label: "MIGRATIONS", value: "FAIL", blocksProduction: true };
  }
}

function checkTests(): Line {
  try {
    execSync("npx vitest run", { encoding: "utf8", stdio: "pipe" });
    return { label: "TESTS", value: "PASS", blocksProduction: false };
  } catch {
    return { label: "TESTS", value: "FAIL", blocksProduction: true };
  }
}

async function checkSeo(): Promise<Line> {
  const productsWithStats = await prisma.product.count({
    where: { active: true, priceStats: { isNot: null } },
  });
  const pass = productsWithStats > 0;
  return {
    label: "SEO",
    value: pass ? "PASS" : "FAIL",
    blocksProduction: !pass,
  };
}

function checkAmazonProvider(): Line {
  return {
    label: "AMAZON PROVIDER",
    value: env.AMAZON_PROVIDER.toUpperCase(),
    blocksProduction: false,
  };
}

function checkAutoPublish(): Line {
  return {
    label: "AUTO PUBLISH",
    value: env.AUTO_PUBLISH ? "ON" : "OFF",
    blocksProduction: false,
  };
}

function checkAdminSecurity(): Line {
  const protectedAdmin = env.ADMIN_ACCESS_TOKEN.length > 0;
  return {
    label: "ADMIN SECURITY",
    value: protectedAdmin ? "TOKEN SET (DEV-GRADE)" : "DEV ONLY",
    blocksProduction: !protectedAdmin,
  };
}

function checkDomain(): Line {
  const deployed = env.NEXT_PUBLIC_SITE_URL === "https://precocaindo.com.br";
  return {
    label: "DOMAIN",
    value: deployed ? "DEPLOYED" : "NOT DEPLOYED",
    blocksProduction: !deployed,
  };
}

function amazonChecksToLines(
  checks: ReturnType<typeof getBrazilReadinessChecks>,
): Line[] {
  return checks.map((c) => ({
    label: c.label,
    value: c.value,
    blocksProduction: !c.pass,
  }));
}

async function main() {
  console.log("PreçoCaindo — production readiness\n");

  const lines: Line[] = [
    await checkDatabase(),
    checkMigrations(),
    checkTests(),
    await checkSeo(),
    checkAmazonProvider(),
    ...amazonChecksToLines(getBrazilReadinessChecks()),
    checkAutoPublish(),
    checkAdminSecurity(),
    checkDomain(),
    ...amazonChecksToLines(getUsReadinessChecks()),
  ];

  const width = Math.max(...lines.map((l) => l.label.length)) + 2;
  for (const line of lines) {
    console.log(`${line.label.padEnd(width, ".")} ${line.value}`);
  }

  const blockers = lines.filter((l) => l.blocksProduction);
  const overall = blockers.length === 0 ? "READY" : "NOT READY";
  console.log(`${"PRODUCTION".padEnd(width, ".")} ${overall}`);

  if (blockers.length > 0) {
    console.log("\nBloqueadores:");
    for (const b of blockers) console.log(`  - ${b.label}: ${b.value}`);
  }

  await prisma.$disconnect();
  process.exitCode = overall === "READY" ? 0 : 1;
}

main();
