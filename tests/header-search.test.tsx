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
