/**
 * Single source of truth for how an Opportunity Score maps to a visual
 * tone — shared by OpportunityBadge (compact) and ScorePanel (large) so
 * the same score always reads the same color everywhere. The score
 * bands themselves come from lib/services/opportunity-score.ts's
 * labelForScore() — this file only adds color, never redefines a
 * threshold.
 */
export interface ScoreTone {
  bg: string;
  fg: string;
  dot: string;
  border: string;
}

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

const NEGATIVE: ScoreTone = {
  bg: "bg-rose-50 dark:bg-rose-950",
  fg: "text-rose-700 dark:text-rose-300",
  dot: "bg-rose-500",
  border: "border-rose-200 dark:border-rose-900",
};

const UNKNOWN: ScoreTone = {
  bg: "bg-slate-100 dark:bg-slate-800",
  fg: "text-slate-600 dark:text-slate-300",
  dot: "bg-slate-400",
  border: "border-slate-200 dark:border-slate-700",
};

/** Mirrors the exact bands labelForScore() uses (>=90, >=75, >=55, >=35,
 * else) — never introduces a new threshold. */
export function toneForScore(score: number, insufficientHistory: boolean): ScoreTone {
  if (insufficientHistory) return UNKNOWN;
  if (score >= 75) return POSITIVE;
  if (score >= 55) return NEUTRAL;
  if (score >= 35) return CAUTION;
  return NEGATIVE;
}
