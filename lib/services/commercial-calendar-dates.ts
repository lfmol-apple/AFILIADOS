/**
 * Pure date math for the commercial calendar (lib/config/commercial-
 * calendar.ts) — no I/O, no config, just "what real calendar date does
 * this moving holiday fall on in year Y". Recomputed every time from the
 * year, never hardcoded per-year, so the calendar never needs manual
 * updates (project brief section 4: "atualizado automaticamente a cada
 * ano, sem depender de intervenção manual").
 */

/** Easter Sunday (Gregorian) — Meeus/Jones/Butcher algorithm, the standard
 * closed-form anonymous algorithm, accurate for any Gregorian year. */
export function computeEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** Carnaval (Tuesday) is always 47 days before Easter Sunday. */
export function computeCarnaval(year: number): Date {
  return addDays(computeEasterSunday(year), -47);
}

/** Good Friday / Sexta-feira Santa — 2 days before Easter Sunday. */
export function computeGoodFriday(year: number): Date {
  return addDays(computeEasterSunday(year), -2);
}

/** 0=Sunday .. 6=Saturday, matching Date#getUTCDay(). The Nth occurrence
 * (1-indexed) of `weekday` in `month` (1-indexed) of `year`. */
export function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  n: number,
): Date {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekday = first.getUTCDay();
  const offset = (weekday - firstWeekday + 7) % 7;
  const day = 1 + offset + (n - 1) * 7;
  return new Date(Date.UTC(year, month - 1, day));
}

/** The last occurrence of `weekday` in `month` of `year`. */
export function lastWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
): Date {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const last = new Date(Date.UTC(year, month - 1, lastDay));
  const diff = (last.getUTCDay() - weekday + 7) % 7;
  return addDays(last, -diff);
}

/** Whole-day difference, `to` minus `from` (positive = `to` is in the
 * future). Both dates are truncated to UTC midnight first so "today" vs.
 * "today at a different hour" never off-by-ones the result. */
export function daysBetween(from: Date, to: Date): number {
  const fromMidnight = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const toMidnight = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );
  return Math.round((toMidnight - fromMidnight) / 86_400_000);
}
