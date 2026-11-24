import { describe, expect, it } from "vitest";
import {
  computeEasterSunday,
  computeCarnaval,
  nthWeekdayOfMonth,
  lastWeekdayOfMonth,
  daysBetween,
} from "@/lib/services/commercial-calendar-dates";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("computeEasterSunday", () => {
  // Known real Easter Sundays (independently verifiable public facts),
  // used only to confirm the algorithm, never fabricated as "the" dates
  // the app relies on — the app always recomputes live.
  it("matches known historical Easter dates", () => {
    expect(iso(computeEasterSunday(2024))).toBe("2024-03-31");
    expect(iso(computeEasterSunday(2025))).toBe("2025-04-20");
    expect(iso(computeEasterSunday(2026))).toBe("2026-04-05");
  });
});

describe("computeCarnaval", () => {
  it("is always 47 days before Easter Sunday", () => {
    const easter = computeEasterSunday(2026);
    const carnaval = computeCarnaval(2026);
    expect(daysBetween(carnaval, easter)).toBe(47);
  });
});

describe("nthWeekdayOfMonth", () => {
  it("finds the 4th Friday of November (Black Friday anchor)", () => {
    // 2026-11-01 is a Sunday, so the 1st Friday is 2026-11-06.
    const fourthFriday = nthWeekdayOfMonth(2026, 11, 5, 4);
    expect(iso(fourthFriday)).toBe("2026-11-27");
    expect(fourthFriday.getUTCDay()).toBe(5);
  });

  it("finds the 2nd Sunday of May (Dia das Mães anchor)", () => {
    const secondSunday = nthWeekdayOfMonth(2026, 5, 0, 2);
    expect(secondSunday.getUTCDay()).toBe(0);
    expect(secondSunday.getUTCDate()).toBeGreaterThan(7);
    expect(secondSunday.getUTCDate()).toBeLessThanOrEqual(14);
  });
});

describe("lastWeekdayOfMonth", () => {
  it("finds the last Friday of a month", () => {
    const lastFriday = lastWeekdayOfMonth(2026, 11, 5);
    expect(lastFriday.getUTCDay()).toBe(5);
    expect(lastFriday.getUTCMonth()).toBe(10); // November, 0-indexed
    // No Friday after it in the same month.
    const oneWeekLater = new Date(lastFriday.getTime() + 7 * 86_400_000);
    expect(oneWeekLater.getUTCMonth()).not.toBe(10);
  });
});

describe("daysBetween", () => {
  it("is truncated to whole days regardless of time-of-day", () => {
    const from = new Date("2026-01-01T23:00:00Z");
    const to = new Date("2026-01-02T01:00:00Z");
    expect(daysBetween(from, to)).toBe(1);
  });

  it("is negative when `to` is in the past relative to `from`", () => {
    const from = new Date("2026-06-01T00:00:00Z");
    const to = new Date("2026-05-01T00:00:00Z");
    expect(daysBetween(from, to)).toBeLessThan(0);
  });
});
