import { describe, expect, it } from "vitest";
import {
  slugify,
  slugifyWithFallback,
  generateUniqueSlug,
} from "@/lib/services/slug";

describe("slugify", () => {
  it("removes accents and lowercases", () => {
    expect(slugify("Café com Açúcar")).toBe("cafe-com-acucar");
  });

  it("replaces non-alphanumeric runs with a single hyphen", () => {
    expect(slugify("Air Fryer 5L -- Inox!!")).toBe("air-fryer-5l-inox");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Produto--  ")).toBe("produto");
  });

  it("returns empty string for input with no slug-safe characters", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("slugifyWithFallback", () => {
  it("appends a suffix derived from the disambiguator", () => {
    expect(slugifyWithFallback("Fone Bluetooth", "B0MOCK0001")).toBe(
      "fone-bluetooth-ck0001",
    );
  });
});

describe("generateUniqueSlug", () => {
  it("returns the base slug when available", async () => {
    const slug = await generateUniqueSlug(
      "Produto Novo",
      "B0000001",
      async () => false,
    );
    expect(slug).toBe("produto-novo");
  });

  it("falls back to a disambiguated slug on collision", async () => {
    const taken = new Set(["produto-novo"]);
    const slug = await generateUniqueSlug(
      "Produto Novo",
      "B0000001",
      async (s) => taken.has(s),
    );
    expect(slug).toBe("produto-novo-000001");
  });

  it("appends a numeric counter if even the disambiguated slug collides", async () => {
    const taken = new Set(["produto-novo", "produto-novo-000001"]);
    const slug = await generateUniqueSlug(
      "Produto Novo",
      "B0000001",
      async (s) => taken.has(s),
    );
    expect(slug).toBe("produto-novo-000001-2");
  });
});
