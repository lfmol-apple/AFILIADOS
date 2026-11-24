import { describe, expect, it } from "vitest";
import {
  ML_GENERAL_SCAN_CATEGORY_GROUPS,
  ML_ALL_SCAN_CATEGORIES,
  pickRotationGroup,
} from "@/lib/config/ml-demand-categories";

describe("General Market Scanner — category rotation", () => {
  it("is deterministic: the same cycle count always returns the same group", () => {
    expect(pickRotationGroup(5)).toEqual(pickRotationGroup(5));
  });

  it("rotates through all groups as the cycle count advances", () => {
    const group0 = pickRotationGroup(0);
    const group1 = pickRotationGroup(1);
    const group2 = pickRotationGroup(2);
    // With 3 real groups, cycle 0/1/2 must each pick a different one —
    // otherwise a category could be starved of ever being scanned.
    expect(group0).not.toEqual(group1);
    expect(group1).not.toEqual(group2);
  });

  it("wraps back to the first group after a full rotation — no category left unscanned forever", () => {
    const groupCount = ML_GENERAL_SCAN_CATEGORY_GROUPS.length;
    expect(pickRotationGroup(0)).toEqual(pickRotationGroup(groupCount));
  });

  it("every category across every group is a real, distinct id (no accidental duplicate)", () => {
    const ids = ML_ALL_SCAN_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^MLB\d+$/);
  });

  it("MLB1051 (Celulares) — the only category verified end-to-end before this phase — is still included, unregressed", () => {
    const ids = ML_ALL_SCAN_CATEGORIES.map((c) => c.id);
    expect(ids).toContain("MLB1051");
  });
});
