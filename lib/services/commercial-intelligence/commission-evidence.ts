import { ML_CATEGORY_TO_COMMISSION_TIER_SLUG } from "@/lib/config/ml-category-commission-map";
import { ML_COMMISSION_TIERS } from "@/lib/config/ml-commission-tiers";

/**
 * Commission evidence, differentiated by type and age (owner's
 * authorization, 2026-11-19, section 4). Never a single number — a
 * commission figure is only meaningful alongside WHERE it came from and
 * HOW OLD it is. "Comissões capturadas em setembro não poderão ser
 * tratadas automaticamente como vigentes em novembro": any individual
 * rate older than MAX_FRESH_DAYS is downgraded to "historical", never
 * silently treated as current.
 */
export type CommissionEvidenceType =
  | "confirmed_individual"
  | "category_tier"
  | "promotional_temporary"
  | "historical"
  | "unknown";

export interface CommissionEvidence {
  type: CommissionEvidenceType;
  /** 0..1, or null when genuinely unknown. */
  rate: number | null;
  capturedAt: Date | null;
  ageDays: number | null;
  /** True once an individual observation is older than MAX_FRESH_DAYS —
   * still reported (never deleted), just no longer presented as current. */
  stale: boolean;
  /** rate × price, in BRL — the owner's explicit priority, 2026-11-19:
   * "considerar principalmente o valor potencial de comissão em reais".
   * Null whenever either side is unknown — never estimated. */
  estimatedValueBrl: number | null;
  source: string;
}

const MAX_FRESH_DAYS = 45;

export function evaluateCommissionEvidence(input: {
  /** A real, individually-observed rate (e.g. panel_pick's raw.rate) —
   * null when no such observation exists for this exact listing. */
  individualRate: number | null;
  individualCapturedAt: Date | null;
  /** Whether that individual observation was itself flagged as a
   * temporary "Ganhos extras" boosted campaign — these expire and must
   * never be treated as a baseline rate. */
  isPromotionalExtra?: boolean;
  /** The real Mercado Livre category id (MLB1051 etc.), when known —
   * used only to look up the bounded category-tier mapping, never
   * guessed for an out-of-scope category. */
  mlCategoryId: string | null;
  currentPrice: number | null;
}): CommissionEvidence {
  const now = Date.now();

  if (input.individualRate !== null) {
    const ageDays = input.individualCapturedAt
      ? Math.floor((now - input.individualCapturedAt.getTime()) / 86_400_000)
      : null;
    const stale = ageDays !== null && ageDays > MAX_FRESH_DAYS;
    const type: CommissionEvidenceType = input.isPromotionalExtra
      ? "promotional_temporary"
      : stale
        ? "historical"
        : "confirmed_individual";
    return {
      type,
      rate: input.individualRate,
      capturedAt: input.individualCapturedAt,
      ageDays,
      stale,
      estimatedValueBrl:
        input.currentPrice !== null ? Math.round(input.currentPrice * input.individualRate * 100) / 100 : null,
      source: stale
        ? `Observação individual real, mas com ${ageDays} dias — fora da janela de ${MAX_FRESH_DAYS} dias considerada vigente.`
        : input.isPromotionalExtra
          ? "Campanha de comissão extra temporária, observada individualmente — pode expirar sem aviso."
          : "Observação individual real do painel de afiliados.",
    };
  }

  const tierSlug = input.mlCategoryId ? ML_CATEGORY_TO_COMMISSION_TIER_SLUG[input.mlCategoryId] : undefined;
  const tier = tierSlug ? ML_COMMISSION_TIERS[tierSlug] : undefined;
  if (tier?.rate != null) {
    return {
      type: "category_tier",
      rate: tier.rate,
      capturedAt: null,
      ageDays: null,
      stale: true, // the tier file itself is dated 2026-09-21 — always flagged, never presented as fresh
      estimatedValueBrl: input.currentPrice !== null ? Math.round(input.currentPrice * tier.rate * 100) / 100 : null,
      source: `Estimativa por categoria (${tierSlug}): ${tier.evidence}. Lida do painel em 2026-09-21 — categoria, não o produto individual.`,
    };
  }

  return {
    type: "unknown",
    rate: null,
    capturedAt: null,
    ageDays: null,
    stale: false,
    estimatedValueBrl: null,
    source:
      "Sem evidência de comissão — a API de descoberta do Mercado Livre não divulga comissão (confirmado: GET /items/{id} retorna 403 para itens de outros vendedores).",
  };
}
