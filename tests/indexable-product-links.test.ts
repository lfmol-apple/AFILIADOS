import { beforeEach, describe, expect, it, vi } from "vitest";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/lib/queries/public-product", () => ({
  listIndexableMerchantProductUrls: list,
}));

import {
  getIndexableProductSlugs,
  resetIndexableProductSlugsCache,
  withIndexableDetailLinks,
} from "@/lib/seo/indexable-product-links";

const card = (id: string, detailHref?: string) => ({ id, detailHref });

beforeEach(() => {
  list.mockReset();
  resetIndexableProductSlugsCache();
});

describe("withIndexableDetailLinks", () => {
  it("keeps links to indexable product pages and drops links to noindex ones", async () => {
    list.mockResolvedValue([{ slug: "bom-produto", lastModified: new Date() }]);
    const out = await withIndexableDetailLinks([
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

  it("handles percent-encoded slugs", async () => {
    list.mockResolvedValue([{ slug: "café-crème", lastModified: new Date() }]);
    const out = await withIndexableDetailLinks([
      card("a", "/produto/caf%C3%A9-cr%C3%A8me"),
    ]);
    expect(out[0].detailHref).toBe("/produto/caf%C3%A9-cr%C3%A8me");
  });

  it("does not compute the (heavy) slug list when no card has a detail link", async () => {
    const cards = [card("a"), card("b")];
    expect(await withIndexableDetailLinks(cards)).toBe(cards);
    expect(list).not.toHaveBeenCalled();
  });

  it("caches the slug list, so repeated calls cost one computation", async () => {
    list.mockResolvedValue([{ slug: "x", lastModified: new Date() }]);
    await getIndexableProductSlugs();
    await getIndexableProductSlugs();
    await withIndexableDetailLinks([card("a", "/produto/x")]);
    expect(list).toHaveBeenCalledTimes(1);
  });

  it("fails open: keeps every link if the list cannot be computed", async () => {
    list.mockRejectedValue(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cards = [card("a", "/produto/qualquer")];
    expect(await withIndexableDetailLinks(cards)).toEqual(cards);
    spy.mockRestore();
  });
});
