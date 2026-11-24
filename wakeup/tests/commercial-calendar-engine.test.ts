import { describe, expect, it } from "vitest";
import {
  getActiveCommercialEvents,
  seasonalWeight,
  strongestEventForCategory,
} from "@/lib/services/commercial-calendar-engine";

describe("getActiveCommercialEvents", () => {
  it("marks Black Friday as 'pico' on its exact peak date", () => {
    // 2026-11-27 is the 4th Friday of November 2026 (verified in
    // commercial-calendar-dates.test.ts).
    const events = getActiveCommercialEvents(new Date("2026-11-27T12:00:00Z"));
    const blackFriday = events.find((e) => e.event.id === "black-friday");
    expect(blackFriday?.stage).toBe("pico");
  });

  it("marks Natal as 'antecipacao' 50 days before (leadDays=60)", () => {
    const events = getActiveCommercialEvents(new Date("2026-11-05T12:00:00Z"));
    const natal = events.find((e) => e.event.id === "natal" && e.year === 2026);
    expect(natal?.stage).toBe("antecipacao");
  });

  it("does not show Black Friday more than its own leadDays (25) before peak", () => {
    const events = getActiveCommercialEvents(new Date("2026-08-01T12:00:00Z"));
    const blackFriday = events.find((e) => e.event.id === "black-friday");
    expect(blackFriday).toBeUndefined();
  });

  it("owner's correction, 2026-11-19: a short-tail event (Halloween, tailDays=2) is OFF 19 days after its peak, not lingering in a generic wind-down", () => {
    // Halloween 2026 peak = Oct 31; Nov 19 is 19 days after.
    const events = getActiveCommercialEvents(new Date("2026-11-19T12:00:00Z"));
    const halloween = events.find((e) => e.event.id === "halloween" && e.year === 2026);
    expect(halloween).toBeUndefined();
  });

  it("a short-tail event is still (barely) active just past its own tailDays boundary", () => {
    // Halloween tailDays=2 -> still inside window ~5 days after peak
    // (pico ends at +3, decline/encerramento extend a couple more days).
    const events = getActiveCommercialEvents(new Date("2026-11-04T12:00:00Z"));
    const halloween = events.find((e) => e.event.id === "halloween" && e.year === 2026);
    expect(halloween).toBeDefined();
  });

  it("a long-tail thematic event (Natal, tailDays=10) stays active well past its peak", () => {
    const events = getActiveCommercialEvents(new Date("2027-01-02T12:00:00Z"));
    const natal = events.find((e) => e.event.id === "natal" && e.year === 2026);
    expect(natal).toBeDefined();
  });

  it("overlaps transitioning events — Natal declining while Verão is in antecipação (brief section 4: never wait for one to end)", () => {
    // Early December: Natal (peak 2026-12-25) hasn't peaked yet, but
    // January's Verão (peak ~2027-01-15) should already be inside its
    // 60-day watch window.
    const events = getActiveCommercialEvents(new Date("2026-12-01T12:00:00Z"));
    const natal = events.find((e) => e.event.id === "natal");
    const verao = events.find((e) => e.event.id === "verao-ferias" && e.year === 2027);
    expect(natal).toBeDefined();
    expect(verao).toBeDefined();
  });
});

describe("seasonalWeight", () => {
  it("is highest exactly at the peak", () => {
    const events = getActiveCommercialEvents(new Date("2026-11-27T12:00:00Z"));
    const blackFriday = events.find((e) => e.event.id === "black-friday")!;
    expect(seasonalWeight(blackFriday)).toBe(1);
  });

  it("ramps up as the peak approaches during antecipação", () => {
    const far = getActiveCommercialEvents(new Date("2026-11-03T12:00:00Z")).find(
      (e) => e.event.id === "black-friday",
    )!;
    const near = getActiveCommercialEvents(new Date("2026-11-20T12:00:00Z")).find(
      (e) => e.event.id === "black-friday",
    )!;
    expect(seasonalWeight(near)).toBeGreaterThan(seasonalWeight(far));
  });
});

describe("strongestEventForCategory", () => {
  it("returns null for a category with no active event", () => {
    const events = getActiveCommercialEvents(new Date("2026-11-27T12:00:00Z"));
    expect(strongestEventForCategory("MLB-NOT-A-REAL-CATEGORY", events)).toBeNull();
  });

  it("returns null when categoryId is null", () => {
    const events = getActiveCommercialEvents(new Date("2026-11-27T12:00:00Z"));
    expect(strongestEventForCategory(null, events)).toBeNull();
  });

  it("finds the matching event for a real category id at its peak", () => {
    const events = getActiveCommercialEvents(new Date("2026-11-27T12:00:00Z"));
    // MLB1051 (Celulares) is in black-friday's categoryIds.
    const match = strongestEventForCategory("MLB1051", events);
    expect(match?.event.id).toBe("black-friday");
  });
});
