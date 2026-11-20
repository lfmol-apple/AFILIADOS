import { beforeEach, describe, expect, it } from "vitest";
import {
  classifySiteClick,
  resetClickNotifyTrackingForTest,
} from "@/lib/http/classify-site-click";

const q = (o: Record<string, string>) => new URLSearchParams(o);
const h = (o: Record<string, string>) => new Headers(o);
const product = q({ pageType: "product", pageSlug: "macbook-pro", source: "product_page" });

beforeEach(() => resetClickNotifyTrackingForTest());

describe("classifySiteClick", () => {
  it("a click from the product's own page is recorded and notifies", () => {
    expect(
      classifySiteClick(
        h({ referer: "https://precocaindo.com.br/produto/macbook-pro", "x-forwarded-for": "1.1.1.1" }),
        product,
      ),
    ).toEqual({ record: true, notify: true });
  });

  it("referer with a query string (e.g. ?utm_source=chatgpt.com) still counts", () => {
    expect(
      classifySiteClick(
        h({ referer: "https://precocaindo.com.br/produto/macbook-pro?utm_source=chatgpt.com" }),
        product,
      ).notify,
    ).toBe(true);
  });

  it.each([
    ["home referer (found live 2026-11-20 — the scraper's signature)", { referer: "https://precocaindo.com.br/" }],
    ["no referer", {}],
    ["/ofertas referer", { referer: "https://precocaindo.com.br/ofertas" }],
    ["another product's page", { referer: "https://precocaindo.com.br/produto/outro" }],
    ["foreign site", { referer: "https://evil.example/produto/macbook-pro" }],
    ["garbage referer", { referer: "not a url" }],
  ])("product click with %s is neither recorded nor notified", (_n, headers) => {
    expect(classifySiteClick(h(headers), product)).toEqual({ record: false, notify: false });
  });

  it("the same visitor re-clicking the same product within 10 min notifies once", () => {
    const headers = h({ referer: "https://precocaindo.com.br/produto/macbook-pro", "x-forwarded-for": "2.2.2.2" });
    expect(classifySiteClick(headers, product, 1_000).notify).toBe(true);
    expect(classifySiteClick(headers, product, 60_000).notify).toBe(false);
    expect(classifySiteClick(headers, product, 11 * 60_000).notify).toBe(true);
  });

  it("ofertas clicks are recorded only from /ofertas and NEVER notify", () => {
    const ofertas = q({ pageType: "ofertas", pageSlug: "ofertas" });
    expect(classifySiteClick(h({ referer: "https://precocaindo.com.br/ofertas" }), ofertas)).toEqual({ record: true, notify: false });
    expect(classifySiteClick(h({ referer: "https://precocaindo.com.br/" }), ofertas)).toEqual({ record: false, notify: false });
    expect(classifySiteClick(h({}), ofertas)).toEqual({ record: false, notify: false });
  });

  it("other origins (telegram, whatsapp...) are recorded as before but never notify", () => {
    expect(classifySiteClick(h({}), q({ pageType: "telegram", source: "telegram" }))).toEqual({ record: true, notify: false });
    expect(classifySiteClick(h({}), new URLSearchParams())).toEqual({ record: true, notify: false });
  });
});
