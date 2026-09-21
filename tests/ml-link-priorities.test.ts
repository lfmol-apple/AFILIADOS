import { describe, expect, it } from "vitest";
import { rankLinkCandidates } from "@/lib/services/ml-link-priorities";
import { estimatedCommissionRate } from "@/lib/config/ml-commission-tiers";

const c = (
  externalId: string,
  title: string,
  rank: number,
  mlDomainId: string | null = null,
) => ({
  externalId,
  title,
  mlDomainId,
  bestsellerRank: rank,
  price: null,
});

describe("rankLinkCandidates", () => {
  it("puts a 16% category above a 5% one even when the 5% one sells more", () => {
    const ranked = rankLinkCandidates([
      c("a", "Smartphone Motorola Moto G06", 1, "MLB-CELLPHONES"),
      c("b", "Creatina Monohidratada 250g", 10, "MLB-SUPPLEMENTS"),
    ]);
    expect(ranked.map((r) => r.externalId)).toEqual(["b", "a"]);
    expect(ranked[0]!.commissionRate).toBe(0.16);
  });

  it("uses demand to order within the same rate", () => {
    const ranked = rankLinkCandidates([
      c("a", "Creatina 500g", 30, "MLB-SUPPLEMENTS"),
      c("b", "Whey", 5, "MLB-SUPPLEMENTS"),
    ]);
    expect(ranked[0]!.externalId).toBe("b");
  });

  it("never guesses: unknown-rate categories go last", () => {
    const ranked = rankLinkCandidates([
      c("a", "Ração para gatos", 1),
      c("b", "Smartphone Motorola", 40, "MLB-CELLPHONES"),
    ]);
    expect(ranked[0]!.externalId).toBe("b");
    expect(ranked[1]!.commissionRate).toBeNull();
  });

  it("has no rate for a category it has not observed", () => {
    expect(estimatedCommissionRate("pet")).toBeNull();
    expect(estimatedCommissionRate("nao-existe")).toBeNull();
  });
});
