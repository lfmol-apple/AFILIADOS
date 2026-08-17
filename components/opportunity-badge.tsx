import { labelForScore } from "@/lib/services/opportunity-score";

function toneForScore(score: number): { bg: string; fg: string; dot: string } {
  if (score >= 90)
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950",
      fg: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  if (score >= 75)
    return {
      bg: "bg-emerald-50 dark:bg-emerald-950",
      fg: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
    };
  if (score >= 55)
    return {
      bg: "bg-amber-50 dark:bg-amber-950",
      fg: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500",
    };
  if (score >= 35)
    return {
      bg: "bg-orange-50 dark:bg-orange-950",
      fg: "text-orange-700 dark:text-orange-300",
      dot: "bg-orange-500",
    };
  return {
    bg: "bg-rose-50 dark:bg-rose-950",
    fg: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  };
}

export function OpportunityBadge({
  score,
  insufficientHistory = false,
  size = "md",
}: {
  score: number;
  insufficientHistory?: boolean;
  size?: "sm" | "md";
}) {
  const label = labelForScore(score, insufficientHistory);
  const tone = insufficientHistory
    ? {
        bg: "bg-slate-100 dark:bg-slate-800",
        fg: "text-slate-600 dark:text-slate-300",
        dot: "bg-slate-400",
      }
    : toneForScore(score);

  const padding = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${tone.bg} ${tone.fg} ${padding}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden />
      {label}
      {!insufficientHistory && <span className="opacity-60">· {score}</span>}
    </span>
  );
}
