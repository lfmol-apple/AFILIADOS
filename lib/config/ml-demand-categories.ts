/**
 * Which Mercado Livre categories the automated demand job
 * (jobs/ml-demand.ts, Automação Operacional V1, 2026-09-08) collects
 * highlights for. No ranking/threshold model invented here — this is a
 * documented, explicit list, exactly like ml-affiliate-queue.ts's
 * DEFAULT_MIN_MONETIZATION_SCORE is an explicit constant rather than a
 * derived one.
 *
 * DOCUMENTED GAP (project brief: "documentar a lacuna, não inventar um
 * modelo complexo"): `MLB1051` ("Celulares e Smartphones") is the ONLY
 * category verified end-to-end against the real API before this list was
 * built (docs/MONETIZATION_SCORE.md's "Execução real, ponta a ponta"
 * section, 2026-09-07: 50 real trend keywords + 18/18 real highlighted
 * products resolved). No other category has been confirmed to behave the
 * same way (different categories can have different highlight coverage,
 * attribute shapes, etc.) — expanding this list is a deliberate, human
 * decision (add a line here, verify it once with
 * `scripts/ml-demand-e2e-check.ts --category <id>` the same way MLB1051
 * was verified), never something the automation should guess or expand
 * on its own.
 */
export const ML_DEMAND_CATEGORY_IDS: readonly string[] = ["MLB1051"];
