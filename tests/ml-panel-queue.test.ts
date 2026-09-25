import { describe, expect, it } from "vitest";
import {
  buildQueue,
  evaluatePick,
  isAlreadyOnSite,
  rankAllForLinking,
} from "@/lib/services/ml-panel-queue";
import type { PanelPick } from "@/lib/config/ml-panel-picks";

const pick = (over: Partial<PanelPick> = {}): PanelPick => ({
  id: over.title ?? "Perfume Feminino Exemplo Lancôme 50ml",
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
  it("skips weak or missing rating and low sales, but never a low percentage", () => {
    expect(evaluatePick(pick({ rate: 0.05 })).status).toBe("queue");
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
  it("ranks by commission in reais, not by percentage", () => {
    const bigTicket = evaluatePick(pick({ rate: 0.05, price: 5000 }));
    const smallTicket = evaluatePick(pick({ rate: 0.16, price: 100 }));
    expect(
      bigTicket.status === "queue" &&
        smallTicket.status === "queue" &&
        bigTicket.score > smallTicket.score,
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
      pick({ title: "Produto Alfa Beta Gama", price: 100 }),
      pick({ title: "Produto Delta Eps Zeta", price: 300 }),
      pick({ title: "Produto Eta Theta Iota", rating: 4.0 }),
    ]);
    expect(queue.map((q) => q.pick.title)).toEqual([
      "Produto Delta Eps Zeta",
      "Produto Alfa Beta Gama",
    ]);
    expect(skipped).toHaveLength(1);
  });
});

describe("rankAllForLinking", () => {
  it("keeps every product, best money+reputation score first, injectables last, on-site apart", () => {
    const { toLink, onSite } = rankAllForLinking(
      [
        pick({ title: "Produto Fraco Alfa Beta", rating: 4.0 }),
        pick({
          title: "Seringa Exemplo Injetavel Uno",
          group: "saude-injetavel",
        }),
        pick({ title: "Produto Forte Delta Eps", price: 400 }),
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

  it("weighs reputation continuously: a better rating outranks an equal-money worse one", () => {
    const { toLink } = rankAllForLinking([
      pick({ title: "Nota Alta", rating: 4.9 }),
      pick({ title: "Nota Baixa", rating: 4.5 }),
    ]);
    expect(toLink.map((e) => e.pick.title)).toEqual([
      "Nota Alta",
      "Nota Baixa",
    ]);
  });

  it("has no hard 'recommended' bucket — big money below the gate still outranks small money above it", () => {
    const { toLink } = rankAllForLinking([
      // Not recommended (rating 4.4 < 4.5), but far more money per sale.
      pick({
        title: "Muito Dinheiro Nota Quase Boa",
        price: 1000,
        rating: 4.4,
      }),
      // Recommended (rating 4.9, sold ok), but little money per sale.
      pick({ title: "Pouco Dinheiro Nota Ótima", price: 200, rating: 4.9 }),
    ]);
    expect(toLink.map((e) => e.pick.title)).toEqual([
      "Muito Dinheiro Nota Quase Boa",
      "Pouco Dinheiro Nota Ótima",
    ]);
    expect(toLink[0]!.recommended).toBe(false);
    expect(toLink[1]!.recommended).toBe(true);
  });
  it("orders by most sold, then commission in reais, then best rated — temporary campaigns are mixed in, not moved", () => {
    const { toLink } = rankAllForLinking([
      pick({ title: "Vende Pouco Comissao Enorme", price: 5000, sold: 50 }),
      pick({ title: "Vende Muito Comissao Media", price: 500, sold: 10000 }),
      pick({
        title: "Vende Muito Comissao Grande Campanha",
        price: 900,
        sold: 10000,
        extras: true,
      }),
      pick({
        title: "Vende Muito Mesma Comissao Nota Melhor",
        price: 500,
        sold: 10000,
        rating: 4.9,
      }),
      pick({ title: "Vende Medio", price: 2000, sold: 1000 }),
    ]);
    expect(toLink.map((e) => e.pick.title)).toEqual([
      "Vende Muito Comissao Grande Campanha",
      "Vende Muito Mesma Comissao Nota Melhor",
      "Vende Muito Comissao Media",
      "Vende Medio",
      "Vende Pouco Comissao Enorme",
    ]);
  });

  it("puts featured rows (Top 20) first, by commission in reais, then the rest by most sold then commission; injectables still last", () => {
    const { toLink } = rankAllForLinking([
      pick({ title: "Vende Muito", sold: 100000, price: 100 }),
      pick({
        title: "Destaque Comissao Menor",
        featured: true,
        sold: 100,
        price: 1000,
      }),
      pick({
        title: "Destaque Comissao Maior",
        featured: true,
        sold: 100,
        price: 2000,
      }),
      pick({ title: "Vende Medio", sold: 5000, price: 300 }),
      pick({
        title: "Seringa Destaque Injetavel",
        group: "saude-injetavel",
        featured: true,
        price: 5000,
      }),
    ]);
    expect(toLink.map((e) => e.pick.title)).toEqual([
      "Destaque Comissao Maior",
      "Destaque Comissao Menor",
      "Vende Muito",
      "Vende Medio",
      "Seringa Destaque Injetavel",
    ]);
    expect(toLink[0]!.notes.join()).toContain("Top 20");
  });
});
