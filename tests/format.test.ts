import { describe, expect, it } from "vitest";
import { truncateForTitleTag } from "@/lib/format";

describe("truncateForTitleTag", () => {
  it("returns the text unchanged when already within the limit", () => {
    expect(truncateForTitleTag("Fone de ouvido Bluetooth", 60)).toBe(
      "Fone de ouvido Bluetooth",
    );
  });

  it("cuts a long marketplace title at a word boundary, never mid-word", () => {
    const long =
      "Power Bank Basike 20000mAh Preto, Carga Rápida 22.5W para iPhone e Samsung, Com Cabos Embutidos e Display";
    const result = truncateForTitleTag(long, 45);
    expect(result.length).toBeLessThanOrEqual(45);
    expect(long.startsWith(result)).toBe(true);
    // Never ends mid-word: the character right after the result (in the
    // original string) must be a space, or the result is the string end.
    const nextChar = long[result.length];
    expect(nextChar === " " || nextChar === undefined).toBe(true);
  });

  it("falls back to a hard cut when there is no reasonable word boundary", () => {
    const noSpaces = "a".repeat(100);
    const result = truncateForTitleTag(noSpaces, 45);
    expect(result.length).toBe(45);
  });
});
