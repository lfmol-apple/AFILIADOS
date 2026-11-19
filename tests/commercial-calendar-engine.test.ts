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

  it("marks Black Friday as 'antecipacao' 50 days before", () => {
    const events = getActiveCommercialEvents(new Date("2026-10-08T12:00:00Z"));
    const blackFriday = events.find((e) => e.event.id === "black-friday");
    expect(blackFriday?.stage).toBe("antecipacao");
  });

  it("does not show an event more than 60 days before its peak", () => {
    const events = getActiveCommercialEvents(new Date("2026-08-01T12:00:00Z"));
    const blackFriday = events.find((e) => e.event.id === "black-friday");
    expect(blackFriday).toBeUndefined();
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
    const far = getActiveCommercialEvents(new Date("2026-09-28T12:00:00Z")).find(
      (e) => e.event.id === "black-friday",
    )!;
    const near = getActiveCommercialEvents(new Date("2026-10-20T12:00:00Z")).find(
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
