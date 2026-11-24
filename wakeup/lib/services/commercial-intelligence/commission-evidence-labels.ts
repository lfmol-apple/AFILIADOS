import type { CommissionEvidenceType } from "@/lib/services/commercial-intelligence/commission-evidence";

/**
 * Owner's directive, 2026-11-21 ("Transparência das comissões —
 * aprovado"): friendly pt-BR labels for the REAL commission evidence
 * types already computed by commission-evidence.ts — never a new
 * taxonomy, "conforme as classificações existentes". Root cause this
 * fixes (2026-11-21 audit): app/admin/vitrine-inteligente/page.tsx
 * printed the raw English/snake_case enum value literally inside a
 * Portuguese sentence (e.g. "R$ 68,67 por venda (30%, historical,
 * desatualizada)").
 */
export const COMMISSION_TYPE_LABELS: Record<CommissionEvidenceType, string> = {
  confirmed_individual: "confirmada e fresca",
  category_tier: "estimada por categoria (nunca individual)",
  promotional_temporary: "promocional (pode expirar sem aviso)",
  historical: "histórica (desatualizada)",
  unknown: "desconhecida",
};

/**
 * Owner's authorization, 2026-11-23 ("Operação Cérebro Comercial" —
 * item 3, "corrigir o tratamento da comissão histórica"): the single,
 * shared confidence table for commission evidence — before this, two
 * DIFFERENT, separately-maintained notions of "how trustworthy is this
 * commission type" existed: vitrine-score.ts had a binary
 * `stale ? 0.5 : 1` multiplier (collapsing confirmed_individual +
 * promotional_temporary into "fresh=1x", and historical + category_tier
 * into "stale=0.5x" — no distinction WITHIN either pair), while
 * priority-adjustment.ts had its own separate 5-level ordinal
 * `COMMISSION_TIER_RANK`, never consulted by the score. Both now read
 * from here — never duplicate this table at a new call site.
 *
 * `rank`: lower = more trustworthy (used as a hard ceiling — a candidate
 * may never out-rank one with a strictly more trustworthy tier,
 * regardless of any other signal). `scoreMultiplier`: how much of the
 * commission component's raw value counts toward VitrineScoreResult —
 * never 0 for anything with a real rate (that would silently treat real
 * evidence as if it didn't exist), never 1 for anything less reliable
 * than a fresh individual observation.
 *
 * Ordering rationale, most to least trustworthy:
 * 1. confirmed_individual — real, individual, <=45 days old.
 * 2. promotional_temporary — real and individual, but a boosted campaign
 *    that "pode expirar sem aviso" (its own source string) — slightly
 *    discounted even though it isn't stale by age.
 * 3. historical — real and individual, but stale (>45 days) — same
 *    confidence cut as before (0.5), now explicit and shared.
 * 4. category_tier — never individually confirmed at all, a category-
 *    wide estimate dated 2026-09-21 — strictly less reliable than an
 *    aged INDIVIDUAL observation, so it sits below historical, not
 *    alongside it (the real gap this item closes: before, both got the
 *    identical 0.5x and the identical "stale" bucket).
 * 5. unknown — no rate at all; the score component is already null in
 *    this case (see vitrine-score.ts), so its multiplier is never
 *    actually applied to a real number — kept at 0 here for completeness
 *    and so priority-adjustment's rank ordering stays total.
 */
export const COMMISSION_CONFIDENCE_TIER: Record<CommissionEvidenceType, { rank: number; scoreMultiplier: number }> = {
  confirmed_individual: { rank: 0, scoreMultiplier: 1 },
  promotional_temporary: { rank: 1, scoreMultiplier: 0.85 },
  historical: { rank: 2, scoreMultiplier: 0.5 },
  category_tier: { rank: 3, scoreMultiplier: 0.35 },
  unknown: { rank: 4, scoreMultiplier: 0 },
};

export interface CommissionEvidenceLike {
  type: CommissionEvidenceType;
  rate: number | null;
  estimatedValueBrl: number | null;
  stale: boolean;
}

/** Replaces the raw-enum-in-a-sentence pattern with a friendly label —
 * same information, never the literal `type` string. */
export function formatCommissionEvidence(
  evidence: CommissionEvidenceLike | null | undefined,
  formatBrl: (value: number | null) => string,
): string {
  if (!evidence || evidence.estimatedValueBrl == null) {
    return "sem evidência (API do ML não divulga)";
  }
  const label = COMMISSION_TYPE_LABELS[evidence.type];
  const percentText = evidence.rate != null ? `${Math.round(evidence.rate * 100)}%` : "taxa desconhecida";
  return `${formatBrl(evidence.estimatedValueBrl)} por venda (${percentText}, ${label})`;
}

export interface CommissionFreshnessSummary {
  total: number;
  counts: Record<CommissionEvidenceType, number>;
  percents: Record<CommissionEvidenceType, number>;
}

/**
 * Owner's directive, 2026-11-21: "Exiba o percentual de produtos com
 * comissão fresca, histórica e desconhecida." Pure, DB-free — the
 * caller passes in the real `commissionEvidence.type` already stored on
 * each active VitrineSelection's scoreBreakdown.
 */
export function summarizeCommissionFreshness(types: CommissionEvidenceType[]): CommissionFreshnessSummary {
  const counts: Record<CommissionEvidenceType, number> = {
    confirmed_individual: 0,
    category_tier: 0,
    promotional_temporary: 0,
    historical: 0,
    unknown: 0,
  };
  for (const t of types) counts[t] += 1;
  const total = types.length;
  const percents = Object.fromEntries(
    (Object.keys(counts) as CommissionEvidenceType[]).map((k) => [k, total > 0 ? Math.round((counts[k] / total) * 100) : 0]),
  ) as Record<CommissionEvidenceType, number>;
  return { total, counts, percents };
}
