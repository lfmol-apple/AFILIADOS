import { describe, expect, it } from "vitest";
import { assessCrop, assessAllPlacements, META_PLACEMENTS } from "@/lib/media/crop-risk";

describe("assessCrop", () => {
  it("flags no risk when the image's ratio exactly matches the placement", () => {
    const feed45 = META_PLACEMENTS.find((p) => p.id === "feed_4_5")!;
    const result = assessCrop({ width: 1024, height: 1280 }, feed45); // exactly 4:5
    expect(result.cutFraction).toBeCloseTo(0, 5);
    expect(result.risk).toBe(false);
    expect(result.axis).toBe("none");
  });

  it("flags a horizontal crop when the image is relatively wider than the placement", () => {
    const stories = META_PLACEMENTS.find((p) => p.id === "stories")!;
    // A square creative (1:1) is much wider than 9:16 — object-cover crops the sides.
    const result = assessCrop({ width: 1254, height: 1254 }, stories);
    expect(result.axis).toBe("horizontal");
    expect(result.cutFraction).toBeCloseTo(1 - 9 / 16, 3);
    expect(result.risk).toBe(true);
  });

  it("flags a vertical crop when the image is relatively taller than the placement", () => {
    const feed11 = META_PLACEMENTS.find((p) => p.id === "feed_1_1")!;
    // A 4:5 creative is taller than a 1:1 frame — object-cover crops top/bottom.
    const result = assessCrop({ width: 1024, height: 1280 }, feed11);
    expect(result.axis).toBe("vertical");
    expect(result.cutFraction).toBeCloseTo(0.2, 3);
    expect(result.risk).toBe(true);
  });

  it("does not flag a small mismatch under the risk threshold", () => {
    const feed45 = META_PLACEMENTS.find((p) => p.id === "feed_4_5")!;
    // 975x1280 (ratio 0.7617) vs 4:5 (0.8) — a small, tolerable mismatch.
    const result = assessCrop({ width: 975, height: 1280 }, feed45);
    expect(result.risk).toBe(false);
  });

  it("assessAllPlacements returns one assessment per real Meta placement", () => {
    const results = assessAllPlacements({ width: 1254, height: 1254 });
    expect(results).toHaveLength(META_PLACEMENTS.length);
    expect(results.map((r) => r.placement.id)).toEqual(META_PLACEMENTS.map((p) => p.id));
  });
});
