import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { runCommercialIntelligenceLab } from "@/lib/services/commercial-intelligence/lab/run-comparison";

/** Runs all four Commercial Intelligence Lab methodologies against
 * today's real candidate pool and permanently records the comparison —
 * owner's requirement: "quero que a inteligência comercial seja
 * permanentemente avaliada." Intended to run alongside VITRINE_RENEW
 * (same cadence) so the Lab always has a fresh comparison point. */
export async function runCommercialLabJob() {
  return runJob("COMMERCIAL_LAB_RUN", async (ctx) => {
    const summary = await runCommercialIntelligenceLab();
    ctx.counters.processed = summary.candidateUniverseSize;
    ctx.counters.created = summary.snapshots.length;
    ctx.metadata.snapshots = summary.snapshots.map((s) => ({
      methodology: s.methodology,
      itemCount: s.itemCount,
      discoveredNewCandidates: s.discoveredNewCandidates,
    }));
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  runCommercialLabJob()
    .then((counters) => console.log("COMMERCIAL_LAB_RUN done:", JSON.stringify(counters)))
    .catch((err) => {
      console.error("COMMERCIAL_LAB_RUN failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
