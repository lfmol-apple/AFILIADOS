import { COMMERCIAL_EVENTS, LEAD_DAYS, type CommercialEvent } from "@/lib/config/commercial-calendar";
import { daysBetween } from "@/lib/services/commercial-calendar-dates";

/**
 * Lifecycle tracking for the commercial calendar (project brief section 4:
 * "mecanismo de acompanhamento do ciclo comercial de cada oportunidade:
 * antecipação, crescimento, consolidação, pico de demanda, declínio,
 * encerramento"). Pure function of "how many days until/since this
 * event's peak" — the brief's own 60/45/30/15 lead markers set where the
 * stage breakpoints fall, so changing LEAD_DAYS changes this too, instead
 * of a second hardcoded set of numbers.
 */
export type EventLifecycleStage =
  | "antecipacao"
  | "crescimento"
  | "consolidacao"
  | "pico"
  | "declinio"
  | "encerramento";

export interface ActiveCommercialEvent {
  event: CommercialEvent;
  year: number;
  peakDate: Date;
  /** Negative once the peak date has passed. */
  daysUntilPeak: number;
  stage: EventLifecycleStage;
}

const [FAR_LEAD, , MID_LEAD] = LEAD_DAYS; // 60, 45, 30, 15 — FAR_LEAD=60, MID_LEAD=30
const DECLINE_WINDOW_DAYS = 10;
const WIND_DOWN_WINDOW_DAYS = 25;

function stageFor(daysUntilPeak: number): EventLifecycleStage | null {
  if (daysUntilPeak > FAR_LEAD) return null;
  if (daysUntilPeak > MID_LEAD) return "antecipacao"; // 60..31
  if (daysUntilPeak > 14) return "crescimento"; // 30..15
  if (daysUntilPeak > 3) return "consolidacao"; // 14..4
  if (daysUntilPeak >= -3) return "pico"; // 3..-3
  if (daysUntilPeak >= -DECLINE_WINDOW_DAYS) return "declinio";
  if (daysUntilPeak >= -WIND_DOWN_WINDOW_DAYS) return "encerramento";
  return null;
}

/**
 * Every commercial event currently inside its watch window, checked
 * against last/this/next year's occurrence of its peak date — so an event
 * that just passed doesn't hide, and next year's doesn't need the
 * calendar to "roll over" manually (brief: "atualizado automaticamente a
 * cada ano"). Never pre-filters by category — lib/services/vitrine-
 * discovery.ts decides what to do with the result.
 */
export function getActiveCommercialEvents(
  referenceDate: Date = new Date(),
): ActiveCommercialEvent[] {
  const active: ActiveCommercialEvent[] = [];
  const year = referenceDate.getUTCFullYear();
  for (const event of COMMERCIAL_EVENTS) {
    for (const candidateYear of [year - 1, year, year + 1]) {
      const peakDate = event.peakDate(candidateYear);
      const daysUntilPeak = daysBetween(referenceDate, peakDate);
      const stage = stageFor(daysUntilPeak);
      if (stage) {
        active.push({ event, year: candidateYear, peakDate, daysUntilPeak, stage });
      }
    }
  }
  return active.sort(
    (a, b) => Math.abs(a.daysUntilPeak) - Math.abs(b.daysUntilPeak),
  );
}

/**
 * 0..1 — how strongly an active event should influence scoring right now.
 * Ramps up approaching the peak, highest AT the peak, tapers off after.
 * This is the one place "seasonal weight" is computed — vitrine-score.ts
 * only consumes the number, never recomputes the ramp.
 */
export function seasonalWeight(active: ActiveCommercialEvent): number {
  switch (active.stage) {
    case "pico":
      return 1;
    case "consolidacao":
      return 0.8;
    case "crescimento":
      return 0.5;
    case "antecipacao": {
      const span = FAR_LEAD - MID_LEAD; // 30
      const progressed = FAR_LEAD - active.daysUntilPeak; // 0..30
      return Math.max(0, Math.min(0.5, (progressed / span) * 0.5));
    }
    case "declinio":
      return 0.4;
    case "encerramento":
      return 0.15;
  }
}

/** The strongest active event for a given real ML category id, if any —
 * used to attach a seasonal reason/weight to a specific listing. */
export function strongestEventForCategory(
  categoryId: string | null,
  active: readonly ActiveCommercialEvent[],
): ActiveCommercialEvent | null {
  if (!categoryId) return null;
  let best: ActiveCommercialEvent | null = null;
  let bestWeight = 0;
  for (const candidate of active) {
    if (!candidate.event.categoryIds.includes(categoryId)) continue;
    const weight = seasonalWeight(candidate);
    if (weight > bestWeight) {
      best = candidate;
      bestWeight = weight;
    }
  }
  return best;
}
