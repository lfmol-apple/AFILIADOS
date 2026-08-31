import {
  labelForVerdict,
  type DecisionResult,
  type DecisionVerdict,
} from "@/lib/services/decision-engine";
import type { ScoreTone } from "@/components/opportunity-tone";

/**
 * The large, product-page version of the buy/wait verdict — this is the
 * component the whole "PRODUTO → PREÇO → VEREDITO → EVIDÊNCIAS → AÇÃO"
 * hierarchy hinges on, so it gets real visual weight (a bordered, tinted
 * card, not a small pill) instead of competing for attention with the
 * price. Takes a DecisionResult (lib/services/decision-engine.ts) —
 * deliberately NOT the same OpportunityScore that drives the compact
 * <OpportunityBadge/> on listing cards. Never invents a verdict when
 * decision.score is null; that state is the honest
 * "ainda estamos acompanhando" message, not a fallback zero.
 */

const POSITIVE: ScoreTone = {
  bg: "bg-emerald-50 dark:bg-emerald-950",
  fg: "text-emerald-700 dark:text-emerald-300",
  dot: "bg-emerald-500",
  border: "border-emerald-200 dark:border-emerald-900",
};
const NEUTRAL: ScoreTone = {
  bg: "bg-amber-50 dark:bg-amber-950",
  fg: "text-amber-700 dark:text-amber-300",
  dot: "bg-amber-500",
  border: "border-amber-200 dark:border-amber-900",
};
const CAUTION: ScoreTone = {
  bg: "bg-orange-50 dark:bg-orange-950",
  fg: "text-orange-700 dark:text-orange-300",
  dot: "bg-orange-500",
  border: "border-orange-200 dark:border-orange-900",
};
const UNKNOWN: ScoreTone = {
  bg: "bg-slate-100 dark:bg-slate-800",
  fg: "text-slate-600 dark:text-slate-300",
  dot: "bg-slate-400",
  border: "border-slate-200 dark:border-slate-700",
};

const VERDICT_TONE: Record<DecisionVerdict, ScoreTone> = {
  BUY_NOW: POSITIVE,
  GOOD_TIME: POSITIVE,
  NEUTRAL: NEUTRAL,
  WAIT: CAUTION,
  INSUFFICIENT_DATA: UNKNOWN,
};

export function ScorePanel({
  decision,
  evidence,
}: {
  decision: DecisionResult;
  /** A single short, data-derived line, e.g. "Abaixo da média de 30 dias" —
   * omit if there's nothing honest to say yet. Ignored when
   * decision.score is null. */
  evidence?: string | null;
}) {
  const label = labelForVerdict(decision.verdict);
  const tone = VERDICT_TONE[decision.verdict];
  const confidenceLabel: Record<typeof decision.confidence, string> = {
    LOW: "confiança baixa",
    MEDIUM: "confiança média",
    HIGH: "confiança alta",
  };

  if (decision.score === null) {
    return (
      <div className={`rounded-2xl border p-5 ${tone.bg} ${tone.border}`}>
        <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
          Vale a pena comprar agora?
        </p>
        <p className={`mt-1 text-lg font-semibold ${tone.fg}`}>{label}</p>
        <p className="text-foreground/60 mt-1 text-sm">
          {decision.reasons[0]?.message ??
            "Ainda não temos dados suficientes para dizer se este é um bom momento para comprar."}
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 ${tone.bg} ${tone.border}`}>
      <p className="text-foreground/60 text-xs font-medium tracking-wide uppercase">
        Vale a pena comprar agora?
      </p>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold tabular-nums ${tone.fg}`}>
          {decision.score}
        </span>
        <span className="text-foreground/40 text-lg">/100</span>
      </div>
      <p
        className={`mt-1 text-sm font-semibold tracking-wide uppercase ${tone.fg}`}
      >
        {label} — {confidenceLabel[decision.confidence]}
      </p>
      {evidence && (
        <p className="text-foreground/60 mt-2 text-sm">{evidence}</p>
      )}
    </div>
  );
}
