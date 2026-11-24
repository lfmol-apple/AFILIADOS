import { prisma } from "@/lib/db";

/**
 * Real root cause fixed, 2026-11-23 ("Operação Cérebro Comercial" —
 * correção do orçamento de rotação). Extracted out of jobs/vitrine-
 * renew.ts so the counting rule has its own direct, fast test —
 * schema.prisma's VitrineSelection.activationSource field doc comment
 * has the full real investigation (8 genuine VITRINE_RENEW executions
 * inside a ~20h development/testing window, confirmed against real
 * AutomationRun rows, had exhausted the real weekly budget for an
 * unrelated real decision days later).
 *
 * Only "engine_commercial_swap" ever counts — a row with no
 * activationSource at all (legacy, predating this field) is excluded,
 * same as "pre_production_testing"/"manual_data_correction", never
 * silently counted just because the field happens to be missing.
 *
 * Deliberately global across every Vitrine, exactly like the rule it
 * replaces — this fix is scoped to the source-type distinction alone;
 * narrowing the budget to per-vitrine would be a real behavior change
 * nobody asked for here.
 */
export async function countRecentCommercialSwaps(sinceDate: Date): Promise<number> {
  return prisma.vitrineSelection.count({
    where: { activatedAt: { gte: sinceDate }, activationSource: "engine_commercial_swap" },
  });
}
