import { describe, expect, it } from "vitest";
import { formatCommissionEvidence, summarizeCommissionFreshness, COMMISSION_TYPE_LABELS } from "@/lib/services/commercial-intelligence/commission-evidence-labels";

const brl = (n: number | null) => (n === null ? "sem dado" : `R$ ${n.toFixed(2).replace(".", ",")}`);

describe("formatCommissionEvidence — never prints the raw enum value", () => {
  it("formats a fresh confirmed commission with a friendly label, never 'confirmed_individual' literally", () => {
    const text = formatCommissionEvidence({ type: "confirmed_individual", rate: 0.1, estimatedValueBrl: 4.79, stale: false }, brl);
    expect(text).toContain("confirmada e fresca");
    expect(text).not.toContain("confirmed_individual");
    expect(text).toContain("R$ 4,79");
    expect(text).toContain("10%");
  });

  it("formats a historical commission without the raw 'historical' token", () => {
    const text = formatCommissionEvidence({ type: "historical", rate: 0.3, estimatedValueBrl: 68.67, stale: true }, brl);
    expect(text).toContain("histórica");
    expect(text).not.toMatch(/\bhistorical\b/);
  });

  it("every real CommissionEvidenceType has a non-raw, non-empty label", () => {
    for (const [type, label] of Object.entries(COMMISSION_TYPE_LABELS)) {
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toBe(type); // label must differ from the raw enum key
    }
  });

  it("falls back to the real 'sem evidência' message when there is no estimated value", () => {
    expect(formatCommissionEvidence(null, brl)).toBe("sem evidência (API do ML não divulga)");
    expect(formatCommissionEvidence({ type: "unknown", rate: null, estimatedValueBrl: null, stale: false }, brl)).toBe(
      "sem evidência (API do ML não divulga)",
    );
  });
});

describe("summarizeCommissionFreshness — real percentages per real type, never invented buckets", () => {
  it("computes counts and percents matching the real audit finding (67% historical, 27% unknown, 7% fresh, out of 30)", () => {
    const types = [
      ...Array(20).fill("historical" as const),
      ...Array(8).fill("unknown" as const),
      ...Array(2).fill("confirmed_individual" as const),
    ];
    const summary = summarizeCommissionFreshness(types);
    expect(summary.total).toBe(30);
    expect(summary.counts.historical).toBe(20);
    expect(summary.counts.unknown).toBe(8);
    expect(summary.counts.confirmed_individual).toBe(2);
    expect(summary.percents.historical).toBe(67);
    expect(summary.percents.unknown).toBe(27);
    expect(summary.percents.confirmed_individual).toBe(7);
  });

  it("returns 0 percent for every bucket on an empty input, never divides by zero", () => {
    const summary = summarizeCommissionFreshness([]);
    expect(summary.total).toBe(0);
    expect(Object.values(summary.percents).every((p) => p === 0)).toBe(true);
  });
});
