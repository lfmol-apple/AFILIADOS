import { describe, expect, it } from "vitest";
import { applyCategoryConcentrationCap } from "@/lib/services/commercial-intelligence/category-concentration";

interface Item {
  id: string;
  categoryId: string | null;
}

describe("applyCategoryConcentrationCap — owner's finding, 2026-11-20 (Auditoria Contínua, section 4)", () => {
  it("caps the real 'dois kits de halteres e dois presépios' pattern: a 3rd of the same category is deferred while slots remain open, making room for a different category instead", () => {
    const ranked: Item[] = [
      { id: "halteres-1", categoryId: "FITNESS" },
      { id: "halteres-2", categoryId: "FITNESS" },
      { id: "halteres-3", categoryId: "FITNESS" }, // 3rd of the same category, ranked above presepio-2 — must be deferred
      { id: "presepio-1", categoryId: "NATAL" },
      { id: "presepio-2", categoryId: "NATAL" },
      { id: "smartphone", categoryId: "ELETRONICOS" },
    ];
    const { picked, deferredByConcentration } = applyCategoryConcentrationCap(ranked, 4, 2, (i) => i.categoryId);
    expect(picked.map((p) => p.id)).toEqual(["halteres-1", "halteres-2", "presepio-1", "presepio-2"]);
    expect(deferredByConcentration.map((p) => p.id)).toContain("halteres-3");
    expect(picked.find((p) => p.id === "smartphone")).toBeUndefined(); // target already met before reaching it
  });

  it("backfills from the deferred pool when the target can't otherwise be reached — diversity never leaves a slot empty", () => {
    const ranked: Item[] = [
      { id: "a", categoryId: "X" },
      { id: "b", categoryId: "X" },
      { id: "c", categoryId: "X" }, // would be deferred by the cap...
    ];
    const { picked, deferredByConcentration } = applyCategoryConcentrationCap(ranked, 3, 2, (i) => i.categoryId);
    // ...but there's nothing else to fill the 3rd slot with, so it comes back.
    expect(picked.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(deferredByConcentration).toEqual([]);
  });

  it("never caps candidates with an unknown (null) category against each other", () => {
    const ranked: Item[] = [
      { id: "a", categoryId: null },
      { id: "b", categoryId: null },
      { id: "c", categoryId: null },
    ];
    const { picked } = applyCategoryConcentrationCap(ranked, 3, 2, (i) => i.categoryId);
    expect(picked.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("respects ranking order within the cap — higher-ranked items of a category always win over lower-ranked ones of the same category", () => {
    const ranked: Item[] = [
      { id: "best", categoryId: "X" },
      { id: "second", categoryId: "X" },
      { id: "third", categoryId: "X" },
      { id: "other-category", categoryId: "Y" },
    ];
    const { picked } = applyCategoryConcentrationCap(ranked, 3, 2, (i) => i.categoryId);
    expect(picked.map((p) => p.id)).toEqual(["best", "second", "other-category"]);
  });
});
