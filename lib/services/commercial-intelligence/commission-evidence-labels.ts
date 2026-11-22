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
