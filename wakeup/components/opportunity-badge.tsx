import { labelForScore } from "@/lib/services/opportunity-score";
import { toneForScore } from "@/components/opportunity-tone";

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
  const tone = toneForScore(score, insufficientHistory);

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
