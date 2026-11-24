import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";

/**
 * Real spend tracking + hard budget ceiling (owner's authorization,
 * 2026-11-19: "não comprometa despesas com geração de imagens sem minha
 * autorização financeira" + "implemente limites configuráveis de
 * gasto"). Every real OpenAI image call MUST go through
 * recordCreativeSpend() right after it succeeds — the ceiling check
 * reads this exact ledger, never an estimate.
 */

export interface BudgetStatus {
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
export async function checkCreativeBudget(): Promise<BudgetStatus> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRows, monthRows] = await Promise.all([
    prisma.vitrineCreativeSpend.findMany({ where: { spentOn: { gte: startOfDay } }, select: { amountUsd: true } }),
    prisma.vitrineCreativeSpend.findMany({ where: { spentOn: { gte: startOfMonth } }, select: { amountUsd: true } }),
  ]);

  const spentTodayUsd = sumDecimal(todayRows.map((r) => r.amountUsd));
  const spentThisMonthUsd = sumDecimal(monthRows.map((r) => r.amountUsd));
  const dailyLimitUsd = env.VITRINE_CREATIVE_DAILY_BUDGET_USD;
  const monthlyLimitUsd = env.VITRINE_CREATIVE_MONTHLY_BUDGET_USD;

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

export async function recordCreativeSpend(input: { amountUsd: number; creativeId?: string; note?: string }): Promise<void> {
  await prisma.vitrineCreativeSpend.create({
    data: {
      spentOn: new Date(),
      amountUsd: input.amountUsd,
      creativeId: input.creativeId ?? null,
      note: input.note ?? null,
    },
  });
}
