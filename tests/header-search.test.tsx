import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

import { HeaderSearch } from "@/components/header-search";

describe("HeaderSearch", () => {
  it("renders nothing on the home page, which has its own search", () => {
    pathname = "/";
    expect(renderToStaticMarkup(<HeaderSearch id="h" className="x" />)).toBe(
      "",
    );
  });

  it("renders a GET search form to /ofertas on every other page", () => {
    for (const path of ["/ofertas", "/achados", "/guias", "/produto/abc"]) {
      pathname = path;
      const html = renderToStaticMarkup(<HeaderSearch id="h" className="x" />);
      expect(html).toContain('action="/ofertas"');
      expect(html).toContain('name="q"');
      expect(html).toContain('role="search"');
    }
  });
});

import { HeaderShortcuts } from "@/components/header-shortcuts";

describe("HeaderShortcuts", () => {
  const categories = [
    { slug: "pet", label: "Pet" },
    { slug: "casa", label: "Casa e Decoração" },
  ];

  it("lists sections and categories on ordinary pages", () => {
    pathname = "/achados";
    const html = renderToStaticMarkup(
      <HeaderShortcuts categories={categories} />,
    );
    expect(html).toContain('href="/achados"');
    expect(html).toContain('href="/guias"');
    expect(html).toContain('href="/ofertas?categoria=pet"');
  });

  it("does not repeat the categories on /ofertas, which shows its own chips", () => {
    pathname = "/ofertas";
    const html = renderToStaticMarkup(
      <HeaderShortcuts categories={categories} />,
    );
    expect(html).toContain('href="/achados"');
    expect(html).not.toContain("categoria=pet");
  });
});
