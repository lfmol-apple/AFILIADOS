import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queries/public-product", () => ({
  listIndexableMerchantProductUrls: list,
}));

import {
  peekIndexableProductSlugs,
  setIndexableProductSlugsForTest,
  stripNoindexDetailLinks,
  waitForIndexableRefreshForTest,
} from "@/lib/seo/indexable-product-links";

const card = (id: string, detailHref?: string) => ({ id, detailHref });

beforeEach(() => {
  list.mockReset();
  list.mockResolvedValue([]);
  setIndexableProductSlugsForTest(null);
});

describe("stripNoindexDetailLinks", () => {
  it("keeps links to indexable product pages and drops links to noindex ones", () => {
    setIndexableProductSlugsForTest(["bom-produto"]);
    const out = stripNoindexDetailLinks([
      card("a", "/produto/bom-produto"),
      card("b", "/produto/pagina-noindex"),
      card("c"),
    ]);
    expect(out.map((c) => c.detailHref)).toEqual([
      "/produto/bom-produto",
      undefined,
      undefined,
    ]);
    expect("detailHref" in out[1]).toBe(false);
  });

  it("handles percent-encoded slugs", () => {
    setIndexableProductSlugsForTest(["café-crème"]);
    const out = stripNoindexDetailLinks([
      card("a", "/produto/caf%C3%A9-cr%C3%A8me"),
    ]);
    expect(out[0].detailHref).toBe("/produto/caf%C3%A9-cr%C3%A8me");
  });

  it("never waits: with no cached list it returns the cards unchanged and refreshes in the background", async () => {
    list.mockResolvedValue([{ slug: "x", lastModified: new Date() }]);
    const cards = [card("a", "/produto/qualquer")];
    expect(stripNoindexDetailLinks(cards)).toBe(cards); // fail open, synchronous
    expect(list).toHaveBeenCalledTimes(1);
    await waitForIndexableRefreshForTest();
    // the next read uses the freshly built list
    expect(stripNoindexDetailLinks(cards)[0].detailHref).toBeUndefined();
  });

  it("does not compute the list when no card has a detail link", () => {
    const cards = [card("a"), card("b")];
    expect(stripNoindexDetailLinks(cards)).toBe(cards);
    expect(list).not.toHaveBeenCalled();
  });

  it("serves a stale list at once while refreshing it once in the background", async () => {
    const longAgo = Date.now() - 31 * 60 * 1000;
    setIndexableProductSlugsForTest(["velho"], longAgo);
    list.mockResolvedValue([{ slug: "novo", lastModified: new Date() }]);
    expect(peekIndexableProductSlugs()?.has("velho")).toBe(true); // stale, served immediately
    peekIndexableProductSlugs();
    expect(list).toHaveBeenCalledTimes(1); // refresh de-duplicated
    await waitForIndexableRefreshForTest();
    expect(peekIndexableProductSlugs()?.has("novo")).toBe(true);
  });

  it("keeps the old list if a background refresh fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    setIndexableProductSlugsForTest(["mantido"], Date.now() - 31 * 60 * 1000);
    list.mockRejectedValue(new Error("db down"));
    peekIndexableProductSlugs();
    await waitForIndexableRefreshForTest();
    expect(peekIndexableProductSlugs()?.has("mantido")).toBe(true);
    spy.mockRestore();
  });
});
