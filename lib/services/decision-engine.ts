import type { PriceStatsResult } from "./price-stats";
import type { OpportunityScoreResult } from "./opportunity-score";

/**
 * Answers "vale a pena comprar agora?" for the visitor on the product page —
 * deliberately a different question, with a different output shape, from
 * OpportunityScore (which answers "onde o PreçoCaindo deveria investir
 * atenção/refresh", used internally to rank the homepage/ofertas listings
 * and drive <OpportunityBadge/>). Both may read the same underlying price
 * signals, but this module's output is never persisted and never feeds a
 * ranking query — see docs/ARCHITECTURE.md "Decision Engine vs Opportunity
 * Score".
 */
export type DecisionVerdict =
  | "BUY_NOW"
  | "GOOD_TIME"
  | "NEUTRAL"
  | "WAIT"
  | "INSUFFICIENT_DATA";

export type DecisionConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface DecisionReason {
  /** Stable, machine-checkable code — never freeform, so tests can assert on
   * it instead of matching Portuguese prose. */
  code:
    | "NO_VERIFIED_PRICE"
    | "LIMITED_HISTORY"
    | "BELOW_BASELINE"
    | "ABOVE_BASELINE"
    | "NEAR_HISTORIC_LOW"
    | "WITHIN_NORMAL_RANGE";
  /** Short, honest, data-derived sentence — never a fabricated claim
   * ("testamos", a review, a spec) the site can't actually back up. */
  message: string;
}

export interface DecisionResult {
  /** Never fabricated. Null whenever there isn't a verified price or enough
   * legitimate history to say anything responsible — see
   * verdict === "INSUFFICIENT_DATA". */
  score: number | null;
  verdict: DecisionVerdict;
  confidence: DecisionConfidence;
  reasons: DecisionReason[];
}

export interface DecisionInput {
  hasOffer: boolean;
  stats: PriceStatsResult | null;
  /** Pass the same OpportunityScoreResult already computed for this
   * product/request — this module never recomputes price sub-scores itself,
   * it only reinterprets them for a visitor-facing verdict. */
  opportunity: OpportunityScoreResult | null;
}

const VERDICT_LABEL: Record<DecisionVerdict, string> = {
  BUY_NOW: "Excelente momento para comprar",
  GOOD_TIME: "Bom momento para comprar",
  NEUTRAL: "Preço dentro do esperado",
  WAIT: "Talvez valha esperar",
  INSUFFICIENT_DATA: "Ainda estamos acompanhando este preço.",
};

/** Single source of truth for verdict copy — anywhere that shows a
 * DecisionVerdict to a human (ScorePanel, the product page's Open Graph
 * image) reads this instead of hardcoding its own string, so they can
 * never drift apart. */
export function labelForVerdict(verdict: DecisionVerdict): string {
  return VERDICT_LABEL[verdict];
}

const NEAR_LOW_THRESHOLD = 0.05;

function confidenceFromOpportunity(confidence: number): DecisionConfidence {
  if (confidence >= 0.66) return "HIGH";
  if (confidence >= 0.33) return "MEDIUM";
  return "LOW";
}

function verdictFromScore(score: number): DecisionVerdict {
  if (score >= 80) return "BUY_NOW";
  if (score >= 65) return "GOOD_TIME";
  if (score >= 40) return "NEUTRAL";
  return "WAIT";
}

export function calculateDecision(input: DecisionInput): DecisionResult {
  if (!input.hasOffer || !input.stats || !input.opportunity) {
    return {
      score: null,
      verdict: "INSUFFICIENT_DATA",
      confidence: "LOW",
      reasons: [
        {
          code: "NO_VERIFIED_PRICE",
          message: "Ainda não temos um preço verificado para este produto.",
        },
      ],
    };
  }

  const { stats, opportunity } = input;

  if (opportunity.insufficientHistory) {
    return {
      score: null,
      verdict: "INSUFFICIENT_DATA",
      confidence: "LOW",
      reasons: [
        {
          code: "LIMITED_HISTORY",
          message: `Só temos ${stats.dataPointCount} observação(ões) de preço até agora — ainda é pouco para dizer se este é um bom momento.`,
        },
      ],
    };
  }

  const reasons: DecisionReason[] = [];
  if (stats.dropPercentage !== null && stats.dropPercentage > 0) {
    reasons.push({
      code: "BELOW_BASELINE",
      message: `Preço ${Math.round(stats.dropPercentage)}% abaixo da média histórica que acompanhamos.`,
    });
  } else if (stats.dropPercentage !== null && stats.dropPercentage < 0) {
    reasons.push({
      code: "ABOVE_BASELINE",
      message: `Preço ${Math.round(Math.abs(stats.dropPercentage))}% acima da média histórica que acompanhamos.`,
    });
  }
  if (stats.distanceFromLow <= NEAR_LOW_THRESHOLD) {
    reasons.push({
      code: "NEAR_HISTORIC_LOW",
      message: "Preço próximo do menor valor que já observamos para este produto.",
    });
  }
  if (reasons.length === 0) {
    reasons.push({
      code: "WITHIN_NORMAL_RANGE",
      message: "Preço dentro da faixa que costumamos observar para este produto.",
    });
  }

  return {
    score: opportunity.score,
    verdict: verdictFromScore(opportunity.score),
    confidence: confidenceFromOpportunity(opportunity.confidence),
    reasons,
  };
}
