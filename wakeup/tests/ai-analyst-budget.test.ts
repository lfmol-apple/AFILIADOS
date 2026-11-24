import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Owner's authorization, 2026-11-22 ("Motor de Inteligência Comercial
 * com IA", section 6: "limites configuráveis de consumo... bloqueio de
 * chamadas acima do orçamento"). Real integration test against the
 * local dev DB — the SAME real ledger pattern already proven for
 * VitrineCreativeSpend, applied to a separate table.
 *
 * env.ts parses process.env once at import time, so a budget ceiling
 * stubbed via vi.stubEnv only takes effect for a module imported AFTER
 * the stub — same convention tests/automation-operational-v1.test.ts
 * already established (vi.resetModules() + dynamic import per test).
 */
describe("AI Commercial Analyst budget ledger", () => {
  afterEach(async () => {
    vi.unstubAllEnvs();
    vi.resetModules();
    await prisma.commercialAnalystSpend.deleteMany({ where: { note: { contains: "teste-orcamento-analista" } } });
  });

  it("allows spend while under both the daily and monthly ceiling", async () => {
    vi.stubEnv("VITRINE_ANALYST_DAILY_BUDGET_USD", "0.05");
    vi.stubEnv("VITRINE_ANALYST_MONTHLY_BUDGET_USD", "1");
    const { checkAnalystBudget } = await import("@/lib/services/commercial-intelligence/ai-analyst/budget");
    const status = await checkAnalystBudget();
    expect(status.allowed).toBe(true);
  });

  it("blocks once real recorded spend reaches the daily ceiling, even with monthly budget left", async () => {
    vi.stubEnv("VITRINE_ANALYST_DAILY_BUDGET_USD", "0.05");
    vi.stubEnv("VITRINE_ANALYST_MONTHLY_BUDGET_USD", "1");
    const { checkAnalystBudget, recordAnalystSpend } = await import("@/lib/services/commercial-intelligence/ai-analyst/budget");
    await recordAnalystSpend({ amountUsd: 0.05, note: "teste-orcamento-analista" });
    const status = await checkAnalystBudget();
    expect(status.allowed).toBe(false);
    expect(status.reason).toContain("Limite diário");
  });

  it("never records spend silently without the real amount persisted", async () => {
    const { recordAnalystSpend } = await import("@/lib/services/commercial-intelligence/ai-analyst/budget");
    await recordAnalystSpend({ amountUsd: 0.0123, note: "teste-orcamento-analista" });
    const row = await prisma.commercialAnalystSpend.findFirst({ where: { note: "teste-orcamento-analista" } });
    expect(row?.amountUsd.toNumber()).toBe(0.0123);
  });
});
