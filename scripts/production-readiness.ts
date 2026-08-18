import "dotenv/config";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { buildReadinessReport, type Line } from "@/lib/readiness/report";

/**
 * CLI wrapper around lib/readiness/report.ts — see that file for the full
 * design rationale (SITE_LAUNCH_READY / CATALOG_LAUNCH_READY / PRODUCTION,
 * why PENDING isn't a failure, why US never blocks BR). This script's only
 * job is to run the real test suite (the one thing the pure report module
 * can't safely do itself, since it's what this script is invoked from
 * inside `npm test` runs too) and print the report.
 */
function runTestSuite(): boolean {
  try {
    execSync("npx vitest run", { encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function printGroup(lines: Line[], group: Line["group"], width: number) {
  for (const l of lines.filter((line) => line.group === group)) {
    console.log(`${l.label.padEnd(width, ".")} ${l.value}`);
  }
}

async function main() {
  console.log("PreçoCaindo — production readiness\n");

  const infrastructureReady = runTestSuite();
  const { lines, siteLaunchReady, catalogLaunchReady, productionReady } =
    await buildReadinessReport({ infrastructureReady });

  const width = Math.max(...lines.map((l) => l.label.length), "SITE_LAUNCH_READY".length) + 2;

  printGroup(lines, "site", width);
  console.log(`\n${"SITE_LAUNCH_READY".padEnd(width, ".")} ${siteLaunchReady ? "READY" : "NOT READY"}\n`);

  printGroup(lines, "catalog", width);
  console.log(`\n${"CATALOG_LAUNCH_READY".padEnd(width, ".")} ${catalogLaunchReady ? "READY" : "NOT READY"}\n`);

  printGroup(lines, "production", width);
  console.log(`\n${"PRODUCTION".padEnd(width, ".")} ${productionReady ? "READY" : "NOT READY"}\n`);

  printGroup(lines, "us", width);

  const siteBlockers = lines.filter((l) => l.blocksSiteLaunch);
  const catalogBlockers = lines.filter((l) => l.blocksCatalogLaunch && !l.blocksSiteLaunch);
  const productionBlockers = lines.filter((l) => l.blocksProduction && !l.blocksCatalogLaunch);

  if (siteBlockers.length > 0) {
    console.log("\nBloqueadores do lançamento do site:");
    for (const b of siteBlockers) console.log(`  - ${b.label}: ${b.value}`);
  }
  if (catalogBlockers.length > 0) {
    console.log("\nBloqueadores adicionais para exibir o catálogo:");
    for (const b of catalogBlockers) console.log(`  - ${b.label}: ${b.value}`);
  }
  if (productionBlockers.length > 0) {
    console.log("\nBloqueadores adicionais para PRODUCTION (venda ao vivo via Amazon):");
    for (const b of productionBlockers) console.log(`  - ${b.label}: ${b.value}`);
  }

  await prisma.$disconnect();
  process.exitCode = siteLaunchReady ? 0 : 1;
}

main();
