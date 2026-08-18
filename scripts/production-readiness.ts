import "dotenv/config";
import { execSync } from "node:child_process";
import { prisma } from "@/lib/db";
import { buildReadinessReport } from "@/lib/readiness/report";

/**
 * CLI wrapper around lib/readiness/report.ts — see that file for the full
 * design rationale (BR_LAUNCH_READY vs PRODUCTION, why PENDING isn't a
 * failure, why US never blocks BR). This script's only job is to run the
 * real test suite (the one thing the pure report module can't safely do
 * itself, since it's what this script is invoked from inside `npm test`
 * runs too) and print the report.
 */
function runTestSuite(): boolean {
  try {
    execSync("npx vitest run", { encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log("PreçoCaindo — production readiness\n");

  const infrastructureReady = runTestSuite();
  const { lines, brLaunchReady, productionReady } = await buildReadinessReport({
    infrastructureReady,
  });

  const width = Math.max(...lines.map((l) => l.label.length)) + 2;
  for (const l of lines) {
    console.log(`${l.label.padEnd(width, ".")} ${l.value}`);
  }

  console.log(
    `\n${"BR_LAUNCH_READY".padEnd(width, ".")} ${brLaunchReady ? "READY" : "NOT READY"}`,
  );
  console.log(
    `${"PRODUCTION".padEnd(width, ".")} ${productionReady ? "READY" : "NOT READY"}`,
  );

  const brLaunchBlockers = lines.filter((l) => l.blocksBrLaunch);
  const productionBlockers = lines.filter((l) => l.blocksProduction);

  if (brLaunchBlockers.length > 0) {
    console.log("\nBloqueadores do lançamento BR:");
    for (const b of brLaunchBlockers) console.log(`  - ${b.label}: ${b.value}`);
  }
  if (productionBlockers.length > brLaunchBlockers.length) {
    console.log("\nBloqueadores adicionais para PRODUCTION (venda ao vivo via Amazon):");
    for (const b of productionBlockers) {
      if (!b.blocksBrLaunch) console.log(`  - ${b.label}: ${b.value}`);
    }
  }

  await prisma.$disconnect();
  process.exitCode = brLaunchReady ? 0 : 1;
}

main();
