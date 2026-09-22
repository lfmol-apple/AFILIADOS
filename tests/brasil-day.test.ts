import { describe, expect, it } from "vitest";
import {
  startOfDayInBrasil,
  startOfDayInBrasilDaysAgo,
} from "@/lib/time/brasil";

describe("startOfDayInBrasil", () => {
  it("21:09 in São Paulo is still the same Brazilian day (not yet UTC's next day)", () => {
    // 2026-09-21 21:09 -03 = 2026-09-22 00:09 UTC
    const now = new Date("2026-09-22T00:09:14.000Z");
    expect(startOfDayInBrasil(now).toISOString()).toBe(
      "2026-09-21T03:00:00.000Z",
    );
  });

  it("just after midnight in São Paulo starts the new day", () => {
    const now = new Date("2026-09-22T03:00:05.000Z"); // 00:00:05 -03
    expect(startOfDayInBrasil(now).toISOString()).toBe(
      "2026-09-22T03:00:00.000Z",
    );
  });

  it("daysAgo returns midnight São Paulo of that earlier day", () => {
    const now = new Date("2026-09-22T00:09:14.000Z");
    expect(startOfDayInBrasilDaysAgo(7, now).toISOString()).toBe(
      "2026-09-14T03:00:00.000Z",
    );
  });
});
