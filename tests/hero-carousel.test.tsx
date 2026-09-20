import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroCarousel } from "@/components/hero-carousel";

describe("HeroCarousel (server render, i.e. what works without JavaScript)", () => {
  const html = renderToStaticMarkup(<HeroCarousel />);

  it("is announced as a carousel with one labelled group per slide", () => {
    expect(html).toContain('aria-roledescription="carousel"');
    const slides = html.match(/aria-roledescription="slide"/g) ?? [];
    expect(slides).toHaveLength(4);
    expect(html).toContain('aria-label="1 de 4"');
    expect(html).toContain('aria-label="4 de 4"');
  });

  it("links every slide to a real section of the site", () => {
    for (const href of ["/ofertas", "/achados", "/guias"]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("has previous/next, per-slide dots and a pause control", () => {
    expect(html).toContain("Slide anterior");
    expect(html).toContain("Próximo slide");
    expect(html).toContain("Ir para o slide 3");
    expect(html).toContain("Pausar rotação automática");
  });

  it("shows no product, price or product image", () => {
    expect(html).not.toMatch(/R\$\s?\d/);
    expect(html).not.toContain("<img");
  });
});
