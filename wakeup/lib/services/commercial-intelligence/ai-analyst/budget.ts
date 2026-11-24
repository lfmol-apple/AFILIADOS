import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";

/**
 * Real spend tracking + hard budget ceiling for the AI Commercial Analyst
 * — same pattern as lib/services/ai-creative-factory/budget.ts, a
 * SEPARATE ledger (owner's authorization, 2026-11-22, section 6: "não
 * execute chamadas pagas sem minha autorização" + "limites configuráveis
 * de consumo"). Every real OpenAI call MUST go through
 * recordAnalystSpend() right after it succeeds — the ceiling check reads
 * this exact ledger, never an estimate.
 */

export interface AnalystBudgetStatus {
  allowed: boolean;
  reason: string;
  spentTodayUsd: number;
  spentThisMonthUsd: number;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
}

function sumDecimal(values: { toNumber(): number }[]): number {
  return values.reduce((acc, v) => acc + v.toNumber(), 0);
}

/** Must be called and checked (`allowed`) BEFORE every real API call —
 * never after, and never bypassed "just this once." */
export async function checkAnalystBudget(): Promise<AnalystBudgetStatus> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRows, monthRows] = await Promise.all([
    prisma.commercialAnalystSpend.findMany({ where: { spentOn: { gte: startOfDay } }, select: { amountUsd: true } }),
    prisma.commercialAnalystSpend.findMany({ where: { spentOn: { gte: startOfMonth } }, select: { amountUsd: true } }),
  ]);

  const spentTodayUsd = sumDecimal(todayRows.map((r) => r.amountUsd));
  const spentThisMonthUsd = sumDecimal(monthRows.map((r) => r.amountUsd));
  const dailyLimitUsd = env.VITRINE_ANALYST_DAILY_BUDGET_USD;
  const monthlyLimitUsd = env.VITRINE_ANALYST_MONTHLY_BUDGET_USD;

  if (spentTodayUsd >= dailyLimitUsd) {
    return {
      allowed: false,
      reason: `Limite diário de US$ ${dailyLimitUsd.toFixed(2)} já atingido (gasto real hoje: US$ ${spentTodayUsd.toFixed(2)}).`,
      spentTodayUsd,
      spentThisMonthUsd,
      dailyLimitUsd,
      monthlyLimitUsd,
    };
  }
  if (spentThisMonthUsd >= monthlyLimitUsd) {
    return {
      allowed: false,
      reason: `Limite mensal de US$ ${monthlyLimitUsd.toFixed(2)} já atingido (gasto real este mês: US$ ${spentThisMonthUsd.toFixed(2)}).`,
      spentTodayUsd,
      spentThisMonthUsd,
      dailyLimitUsd,
      monthlyLimitUsd,
    };
  }
  return {
    allowed: true,
    reason: "Dentro do orçamento configurado.",
    spentTodayUsd,
    spentThisMonthUsd,
    dailyLimitUsd,
    monthlyLimitUsd,
  };
}

export async function recordAnalystSpend(input: { amountUsd: number; evaluationId?: string; note?: string }): Promise<void> {
  await prisma.commercialAnalystSpend.create({
    data: {
      spentOn: new Date(),
      amountUsd: input.amountUsd,
      evaluationId: input.evaluationId ?? null,
      note: input.note ?? null,
    },
  });
}
