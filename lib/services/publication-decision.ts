import type { QualityVerdict } from "./content-quality-gate";

export type PublicationDecision = "CREATE" | "UPDATE" | "KEEP" | "NOINDEX" | "REJECT";

/** Below this DemandEngine overallScore, content is not worth indexing yet
 * even if it's factually correct and well-written — there's no evidence
 * anyone is looking for it (project brief Part F/C). */
const MIN_DEMAND_SCORE_FOR_INDEXING = 20;

export interface PublicationDecisionInput {
  /** The entity has real underlying data (an offer, price history,
   * specifications) — not just an ASIN. */
  hasRealData: boolean;
  /** That data clears the minimum bar (e.g. enough history, enough specs)
   * to say something meaningful. */
  dataQualitySufficient: boolean;
  /** DemandEngine overallScore for the related keyword/entity, or null when
   * there's no demand signal at all yet (not the same as "zero demand" —
   * see lib/demand/scoring.ts). */
  demandScore: number | null;
  /** ContentQualityGate verdict, or null when content hasn't been
   * generated yet (a pre-generation REJECT can fire without it). */
  qualityGateVerdict: QualityVerdict | null;
  /** Whether an already-published version is still up to date. Irrelevant
   * when alreadyPublished is false. */
  isFresh: boolean;
  alreadyPublished: boolean;
  /** Computed by the caller (e.g. value-add ratio over the raw listing) —
   * the one hard rule this engine exists to enforce: never publish just
   * because "temos um ASIN" (project brief Part F). */
  canAddRealValue: boolean;
}

export interface PublicationDecisionResult {
  decision: PublicationDecision;
  reasons: string[];
}

/**
 * Decides whether a page deserves to exist/stay indexed. This is the gate
 * between "we have a product" and "we publish a page" — ContentQualityGate
 * checks the content itself; this checks whether the content should exist
 * at all, combining data sufficiency, demand, and editorial uniqueness.
 */
export function decidePublication(input: PublicationDecisionInput): PublicationDecisionResult {
  if (!input.hasRealData) {
    return { decision: "REJECT", reasons: ["Sem dados reais suficientes para gerar a página"] };
  }
  if (!input.canAddRealValue) {
    return {
      decision: "REJECT",
      reasons: ['Não agrega valor além da ficha do marketplace ("temos um ASIN" não é motivo suficiente)'],
    };
  }
  if (input.qualityGateVerdict === "FAIL") {
    return { decision: "REJECT", reasons: ["Reprovado pelo ContentQualityGate"] };
  }
  if (!input.dataQualitySufficient) {
    return { decision: "REJECT", reasons: ["Dados insuficientes (histórico ou especificações abaixo do mínimo)"] };
  }

  const weakDemand = input.demandScore !== null && input.demandScore < MIN_DEMAND_SCORE_FOR_INDEXING;

  if (input.alreadyPublished) {
    if (input.qualityGateVerdict === "REVIEW") {
      return { decision: "UPDATE", reasons: ["Conteúdo publicado precisa de revisão"] };
    }
    if (!input.isFresh) {
      return { decision: "UPDATE", reasons: ["Conteúdo publicado está desatualizado"] };
    }
    if (weakDemand) {
      return { decision: "NOINDEX", reasons: ["Demanda insuficiente para manter indexado"] };
    }
    return { decision: "KEEP", reasons: ["Conteúdo publicado continua válido"] };
  }

  if (weakDemand) {
    return {
      decision: "NOINDEX",
      reasons: ["Dados válidos, mas sem demanda suficiente para justificar indexação agora"],
    };
  }

  if (input.qualityGateVerdict === "REVIEW") {
    return { decision: "NOINDEX", reasons: ["Conteúdo criado mas precisa de revisão humana antes de indexar"] };
  }

  return {
    decision: "CREATE",
    reasons: ["Dados suficientes, conteúdo aprovado, demanda/intenção justificam publicação"],
  };
}
