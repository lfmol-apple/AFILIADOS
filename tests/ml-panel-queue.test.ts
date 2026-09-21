import { describe, expect, it } from "vitest";
import {
  buildQueue,
  evaluatePick,
  isAlreadyOnSite,
  rankAllForLinking,
} from "@/lib/services/ml-panel-queue";
import type { PanelPick } from "@/lib/config/ml-panel-picks";

const pick = (over: Partial<PanelPick> = {}): PanelPick => ({
  title: "Perfume Feminino Exemplo Lancôme 50ml",
  rate: 0.16,
  extras: false,
  price: 200,
  sold: 10000,
  rating: 4.8,
  group: "beleza",
  capturedAt: "2026-09-21",
  ...over,
});

describe("evaluatePick", () => {
  it("queues a strong product", () => {
    expect(evaluatePick(pick()).status).toBe("queue");
  });
  it("skips low commission, weak or missing rating, and low sales", () => {
    expect(evaluatePick(pick({ rate: 0.05 })).status).toBe("skip");
    expect(evaluatePick(pick({ rating: 4.3 })).status).toBe("skip");
    expect(evaluatePick(pick({ rating: null })).status).toBe("skip");
    expect(evaluatePick(pick({ sold: 100 })).status).toBe("skip");
  });
  it("flags a temporary campaign instead of hiding it", () => {
    const v = evaluatePick(pick({ extras: true }));
    expect(v.status === "queue" && v.reasons.join()).toContain(
      "campanha temporária",
    );
  });
  it("caps the price so an expensive item does not dominate", () => {
    const cheap = evaluatePick(pick({ price: 300 }));
    const dear = evaluatePick(pick({ price: 3000 }));
    expect(
      cheap.status === "queue" &&
        dear.status === "queue" &&
        cheap.score === dear.score,
    ).toBe(true);
  });
});

describe("isAlreadyOnSite", () => {
  it("matches a product whose slug carries the title's words", () => {
    expect(
      isAlreadyOnSite("Creatina Monohidratada 500g em Pó Growth", [
        "creatina-monohidratada-500g-em-po-growth",
      ]),
    ).toBe(true);
  });
  it("does not match a different product", () => {
    expect(
      isAlreadyOnSite("Perfume Rabanne Fame Eau de Parfum 150 ml", [
        "fralda-huggies-tripla-protecao-g",
      ]),
    ).toBe(false);
  });
});

describe("buildQueue", () => {
  it("orders by score, best first, and separates skipped", () => {
    const { queue, skipped } = buildQueue([
      pick({ title: "Produto Alfa Beta Gama", rate: 0.12 }),
      pick({ title: "Produto Delta Eps Zeta", rate: 0.16 }),
      pick({ title: "Produto Eta Theta Iota", rate: 0.05 }),
    ]);
    expect(queue.map((q) => q.pick.title)).toEqual([
      "Produto Delta Eps Zeta",
      "Produto Alfa Beta Gama",
    ]);
    expect(skipped).toHaveLength(1);
  });
});

describe("rankAllForLinking", () => {
  it("keeps every product, recommended first, injectables last, on-site apart", () => {
    const { toLink, onSite } = rankAllForLinking(
      [
        pick({ title: "Produto Fraco Alfa Beta", rate: 0.05 }),
        pick({
          title: "Seringa Exemplo Injetavel Uno",
          group: "saude-injetavel",
        }),
        pick({ title: "Produto Forte Delta Eps", rate: 0.16 }),
        pick({ title: "Creatina Monohidratada Growth Supplements" }),
      ],
      ["creatina-monohidratada-growth-supplements-250g"],
    );
    expect(onSite).toHaveLength(1);
    expect(toLink.map((e) => e.pick.title)).toEqual([
      "Produto Forte Delta Eps",
      "Produto Fraco Alfa Beta",
      "Seringa Exemplo Injetavel Uno",
    ]);
    expect(toLink[0]!.recommended).toBe(true);
    expect(toLink[1]!.recommended).toBe(false);
    expect(toLink[2]!.notes.join()).toContain("injetável");
  });
});
