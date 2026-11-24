import { describe, expect, it } from "vitest";
import { decidePublication } from "@/lib/services/publication-decision";

const base = {
  hasRealData: true,
  dataQualitySufficient: true,
  demandScore: 60,
  qualityGateVerdict: "PASS" as const,
  isFresh: true,
  alreadyPublished: false,
  canAddRealValue: true,
};

describe("decidePublication", () => {
  it("rejects when there is no real data, before checking anything else", () => {
    const result = decidePublication({ ...base, hasRealData: false });
    expect(result.decision).toBe("REJECT");
  });

  it("rejects content that doesn't add value beyond the marketplace listing", () => {
    const result = decidePublication({ ...base, canAddRealValue: false });
    expect(result.decision).toBe("REJECT");
  });

  it("rejects content the quality gate failed", () => {
    const result = decidePublication({ ...base, qualityGateVerdict: "FAIL" });
    expect(result.decision).toBe("REJECT");
  });

  it("rejects when data quality is insufficient even if flagged as real", () => {
    const result = decidePublication({ ...base, dataQualitySufficient: false });
    expect(result.decision).toBe("REJECT");
  });

  it("creates a new page when data, quality and demand all check out", () => {
    const result = decidePublication(base);
    expect(result.decision).toBe("CREATE");
  });

  it("never creates a page just because a product exists, with zero demand signal and marginal value", () => {
    const result = decidePublication({ ...base, demandScore: 5 });
    expect(result.decision).toBe("NOINDEX");
  });

  it("still allows creation when demand is simply unknown (null), not necessarily weak", () => {
    const result = decidePublication({ ...base, demandScore: null });
    expect(result.decision).toBe("CREATE");
  });

  it("sends REVIEW-quality content to NOINDEX instead of publishing it live", () => {
    const result = decidePublication({ ...base, qualityGateVerdict: "REVIEW" });
    expect(result.decision).toBe("NOINDEX");
  });

  it("keeps an already-published, fresh, in-demand page as is", () => {
    const result = decidePublication({ ...base, alreadyPublished: true });
    expect(result.decision).toBe("KEEP");
  });

  it("flags an already-published page for update when it goes stale", () => {
    const result = decidePublication({
      ...base,
      alreadyPublished: true,
      isFresh: false,
    });
    expect(result.decision).toBe("UPDATE");
  });

  it("flags an already-published page for update when it needs review", () => {
    const result = decidePublication({
      ...base,
      alreadyPublished: true,
      qualityGateVerdict: "REVIEW",
    });
    expect(result.decision).toBe("UPDATE");
  });

  it("noindexes an already-published page whose demand has dried up", () => {
    const result = decidePublication({
      ...base,
      alreadyPublished: true,
      demandScore: 2,
    });
    expect(result.decision).toBe("NOINDEX");
  });
});
