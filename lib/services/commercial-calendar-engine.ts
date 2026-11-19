import { COMMERCIAL_EVENTS, type CommercialEvent } from "@/lib/config/commercial-calendar";
import { daysBetween } from "@/lib/services/commercial-calendar-dates";

/**
 * Lifecycle tracking for the commercial calendar (project brief section 4:
 * "mecanismo de acompanhamento do ciclo comercial de cada oportunidade:
 * antecipação, crescimento, consolidação, pico de demanda, declínio,
 * encerramento"). Owner's correction, 2026-11-19 (section 7): windows are
 * now PER-EVENT (event.leadDays/tailDays), not one global shape — "não faz
 * sentido anunciar produtos específicos de Halloween 19 dias depois da
 * data." A short-tail event (Halloween, tailDays=2) simply stops being
 * active (returns null from getActiveCommercialEvents) once past its own
 * tail, instead of lingering in a generic 25-day wind-down.
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

const DEFAULT_LEAD_DAYS = 60;
const DEFAULT_TAIL_DAYS = 10;

function stageFor(daysUntilPeak: number, leadDays: number, tailDays: number): EventLifecycleStage | null {
  if (daysUntilPeak > leadDays) return null;
  if (daysUntilPeak > leadDays * 0.5) return "antecipacao";
  if (daysUntilPeak > Math.max(3, leadDays * 0.15)) return "crescimento";
  if (daysUntilPeak > 3) return "consolidacao";
  if (daysUntilPeak >= -3) return "pico";
  const declineEnd = -3 - Math.max(1, Math.round(tailDays / 2));
  if (daysUntilPeak >= declineEnd) return "declinio";
  if (daysUntilPeak >= -3 - tailDays) return "encerramento";
  return null;
}

/**
 * Every commercial event currently inside its own watch window, checked
 * against last/this/next year's occurrence of its peak date — so an event
 * that just passed doesn't hide, and next year's doesn't need the
 * calendar to "roll over" manually (brief: "atualizado automaticamente a
 * cada ano"). Never pre-filters by category — discovery/selection
 * services decide what to do with the result.
 */
export function getActiveCommercialEvents(
  referenceDate: Date = new Date(),
): ActiveCommercialEvent[] {
  const active: ActiveCommercialEvent[] = [];
  const year = referenceDate.getUTCFullYear();
  for (const event of COMMERCIAL_EVENTS) {
    const leadDays = event.leadDays ?? DEFAULT_LEAD_DAYS;
    const tailDays = event.tailDays ?? DEFAULT_TAIL_DAYS;
    for (const candidateYear of [year - 1, year, year + 1]) {
      const peakDate = event.peakDate(candidateYear);
      const daysUntilPeak = daysBetween(referenceDate, peakDate);
      const stage = stageFor(daysUntilPeak, leadDays, tailDays);
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
 * This is the one place "seasonal weight" is computed.
 */
export function seasonalWeight(active: ActiveCommercialEvent): number {
  const leadDays = active.event.leadDays ?? DEFAULT_LEAD_DAYS;
  switch (active.stage) {
    case "pico":
      return 1;
    case "consolidacao":
      return 0.8;
    case "crescimento":
      return 0.5;
    case "antecipacao": {
      const span = leadDays * 0.5;
      const progressed = leadDays - active.daysUntilPeak;
      return Math.max(0, Math.min(0.5, (progressed / span) * 0.5));
    }
    case "declinio":
      return 0.4;
    case "encerramento":
      return 0.15;
  }
}

/** The strongest active event for a given real ML category id, if any —
 * used only as a loose categorization hint for THEMATIC events (a
 * promotional event's category match alone is deliberately NOT treated
 * as event relevance by lib/services/vitrine-selection.ts — only a
 * direct keyword/price-drop match is). */
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
