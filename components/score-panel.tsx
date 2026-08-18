import { labelForScore } from "@/lib/services/opportunity-score";
import { toneForScore } from "@/components/opportunity-tone";

/**
 * The large, product-page version of the Score/veredict — this is the
 * component the whole "PRODUTO → PREÇO → VEREDITO → EVIDÊNCIAS → AÇÃO"
 * hierarchy hinges on, so it gets real visual weight (a bordered, tinted
 * card, not a small pill) instead of competing for attention with the
 * price. Compact listings still use <OpportunityBadge />; this is only
 * for the product page hero. Never invents a threshold — label/tone come
 * from the same domain functions the badge uses.
 */
export function ScorePanel({
  score,
  insufficientHistory,
  evidence,
}: {
  score: number;
  insufficientHistory: boolean;
  /** A single short, data-derived line, e.g. "Abaixo da média de 30 dias" —
   * omit if there's nothing honest to say yet. */
  evidence?: string | null;
}) {
  const label = labelForScore(score, insufficientHistory);
  const tone = toneForScore(score, insufficientHistory);

  if (insufficientHistory) {
    return (
      <div className={`rounded-2xl border p-5 ${tone.bg} ${tone.border}`}>
        <p className={`text-sm font-semibold ${tone.fg}`}>{label}</p>
        <p className="text-foreground/60 mt-1 text-sm">
          Ainda não temos dados suficientes para dizer se este é um bom momento
          para comprar.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border p-5 ${tone.bg} ${tone.border}`}>
      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-bold tabular-nums ${tone.fg}`}>{score}</span>
        <span className="text-foreground/40 text-lg">/100</span>
      </div>
      <p className={`mt-1 text-sm font-semibold tracking-wide uppercase ${tone.fg}`}>
        {label}
      </p>
      {evidence && (
        <p className="text-foreground/60 mt-2 text-sm">{evidence}</p>
      )}
    </div>
  );
}
