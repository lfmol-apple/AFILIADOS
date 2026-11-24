import { prisma } from "@/lib/db";
import { runJob } from "@/lib/jobs/automation-run";
import { logger } from "@/lib/observability/logger";

/**
 * Owner's directive, 2026-11-21 ("Histórico de candidatos — aprovado"):
 * "Adote retenção configurável, com padrão inicial de 60 dias. Implemente
 * e teste a rotina de limpeza, mas deixe sua execução automática
 * desativada até autorização específica." This job exists, is unit-
 * tested, and can be run manually — but it is NOT wired into any cron,
 * any orchestrator (jobs/run-ml-shopee-cycle.ts), or any other automatic
 * trigger. As a second, independent safeguard (same pattern as this
 * project's other paid/sensitive gates, e.g. VITRINE_CREATIVE_MODE), its
 * own entrypoint below also refuses to run unless
 * VITRINE_SELECTION_ROUND_CLEANUP_ENABLED=true is explicitly set — so
 * even an accidental cron line pointing at this file would still do
 * nothing without a deliberate, separate opt-in.
 *
 * VitrineSelectionRound -> VitrineSelectionRoundCandidate cascades
 * (onDelete: Cascade in schema.prisma), so deleting the parent round row
 * is enough — no separate candidate-row delete needed.
 */

export const VITRINE_SELECTION_ROUND_RETENTION_DAYS = Number(
  process.env.VITRINE_SELECTION_ROUND_RETENTION_DAYS ?? 60,
);

/** Pure-ish core: takes "now" as an explicit argument so it's testable
 * without mocking Date, and returns how many rounds (and, by cascade,
 * their candidate rows) were deleted. */
export async function pruneOldSelectionRounds(retentionDays: number, now: Date): Promise<{ deletedRounds: number }> {
  const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
  const result = await prisma.vitrineSelectionRound.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return { deletedRounds: result.count };
}

export async function runVitrineSelectionRoundCleanupJob() {
  return runJob("VITRINE_SELECTION_ROUND_CLEANUP", async (ctx) => {
    const { deletedRounds } = await pruneOldSelectionRounds(VITRINE_SELECTION_ROUND_RETENTION_DAYS, new Date());
    ctx.counters.processed = deletedRounds;
    ctx.metadata.retentionDays = VITRINE_SELECTION_ROUND_RETENTION_DAYS;
    logger.info("vitrine_selection_round_cleanup.done", { deletedRounds, retentionDays: VITRINE_SELECTION_ROUND_RETENTION_DAYS });
  });
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  if (process.env.VITRINE_SELECTION_ROUND_CLEANUP_ENABLED !== "true") {
    console.log(
      "VITRINE_SELECTION_ROUND_CLEANUP: desativado (defina VITRINE_SELECTION_ROUND_CLEANUP_ENABLED=true para autorizar a execução real). Nenhuma linha foi apagada.",
    );
    process.exit(0);
  }
  runVitrineSelectionRoundCleanupJob()
    .then((counters) => {
      console.log("VITRINE_SELECTION_ROUND_CLEANUP done:", JSON.stringify(counters));
    })
    .catch((err) => {
      console.error("VITRINE_SELECTION_ROUND_CLEANUP failed:", err instanceof Error ? err.message : err);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
