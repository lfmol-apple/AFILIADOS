import { describe, expect, it } from "vitest";
import { decideProductPriority } from "@/lib/services/product-priority";

const now = new Date("2026-08-18T12:00:00Z");
const HOUR = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(now.getTime() - hours * HOUR);
}

describe("decideProductPriority", () => {
  it("promotes COLD directly to HOT on a strong signal", () => {
    const result = decideProductPriority({
      currentPriority: "COLD",
      priorityUpdatedAt: hoursAgo(200),
      opportunityScore: 92,
      dropPercentage: 30,
      availability: "IN_STOCK",
      recentClicks: 0,
      now,
    });
    expect(result.priority).toBe("HOT");
    expect(result.changed).toBe(true);
  });

  it("does not demote a HOT product within the stability window", () => {
    const result = decideProductPriority({
      currentPriority: "HOT",
      priorityUpdatedAt: hoursAgo(1),
      opportunityScore: 20,
      dropPercentage: 0,
      availability: "IN_STOCK",
      recentClicks: 0,
      now,
    });
    expect(result.changed).toBe(false);
    expect(result.priority).toBe("HOT");
  });

  it("does not demote a HOT product before the staleness window even outside stability window", () => {
    const result = decideProductPriority({
      currentPriority: "HOT",
      priorityUpdatedAt: hoursAgo(24), // > minStabilityHours, < hotStaleAfterDays (3d)
      opportunityScore: 20,
      dropPercentage: 0,
      availability: "IN_STOCK",
      recentClicks: 0,
      now,
    });
    expect(result.changed).toBe(false);
  });

  it("demotes HOT to WARM once stale and signals no longer qualify", () => {
    const result = decideProductPriority({
      currentPriority: "HOT",
      priorityUpdatedAt: hoursAgo(24 * 4), // > hotStaleAfterDays (3d)
      opportunityScore: 60,
      dropPercentage: 0,
      availability: "IN_STOCK",
      recentClicks: 0,
      now,
    });
    expect(result.priority).toBe("WARM");
    expect(result.changed).toBe(true);
  });

  it("demotes WARM to COLD once stale and signals no longer qualify", () => {
    const result = decideProductPriority({
      currentPriority: "WARM",
      priorityUpdatedAt: hoursAgo(24 * 20), // > warmStaleAfterDays (14d)
      opportunityScore: 10,
      dropPercentage: 0,
      availability: "IN_STOCK",
      recentClicks: 0,
      now,
    });
    expect(result.priority).toBe("COLD");
    expect(result.changed).toBe(true);
  });

  it("caps an out-of-stock product below HOT even with an excellent score", () => {
    const result = decideProductPriority({
      currentPriority: "WARM",
      priorityUpdatedAt: hoursAgo(200),
      opportunityScore: 99,
      dropPercentage: 50,
      availability: "OUT_OF_STOCK",
      recentClicks: 10,
      now,
    });
    expect(result.priority).not.toBe("HOT");
  });

  it("immediately demotes a HOT product that goes out of stock, bypassing stability/staleness windows", () => {
    const result = decideProductPriority({
      currentPriority: "HOT",
      priorityUpdatedAt: hoursAgo(1), // well within the stability window
      opportunityScore: 95,
      dropPercentage: 40,
      availability: "OUT_OF_STOCK",
      recentClicks: 20,
      now,
    });
    expect(result.priority).toBe("WARM");
    expect(result.changed).toBe(true);
    expect(result.reason).toMatch(/out of stock/);
  });

  it("keeps HOT products HOT when signals continue to justify it", () => {
    const result = decideProductPriority({
      currentPriority: "HOT",
      priorityUpdatedAt: hoursAgo(24 * 10),
      opportunityScore: 95,
      dropPercentage: 25,
      availability: "IN_STOCK",
      recentClicks: 8,
      now,
    });
    expect(result.priority).toBe("HOT");
    expect(result.changed).toBe(false);
  });

  it("promotes based on recent clicks alone", () => {
    const result = decideProductPriority({
      currentPriority: "COLD",
      priorityUpdatedAt: hoursAgo(200),
      opportunityScore: 10,
      dropPercentage: 0,
      availability: "IN_STOCK",
      recentClicks: 6,
      now,
    });
    expect(result.priority).toBe("HOT");
  });
});
