import { describe, expect, it } from "vitest";
import {
  AMAZON_REQUIRED_DISCLOSURE,
  isDisclosureCompliant,
} from "@/lib/amazon/disclosure";
import { env } from "@/lib/config/env";
import { STATIC_ROUTE_PATHS } from "@/app/sitemap";

describe("Amazon required affiliate disclosure", () => {
  it("accepts the exact statement Amazon Brasil requires, ignoring trailing period and spacing", () => {
    expect(isDisclosureCompliant(AMAZON_REQUIRED_DISCLOSURE)).toBe(true);
    expect(
      isDisclosureCompliant(
        "Como participante do Programa de Associados da Amazon,  sou remunerado pelas compras qualificadas efetuadas",
      ),
    ).toBe(true);
  });

  it("rejects the old shortened wording", () => {
    expect(
      isDisclosureCompliant(
        "Como associado da Amazon, eu ganho com compras qualificadas.",
      ),
    ).toBe(false);
  });

  it("ships the required statement as the default configuration", () => {
    if (!process.env.AMAZON_ASSOCIATE_DISCLOSURE) {
      expect(isDisclosureCompliant(env.AMAZON_ASSOCIATE_DISCLOSURE)).toBe(true);
    }
  });
});

describe("public Amazon page", () => {
  it("is listed in the sitemap so Amazon's reviewers can find it", () => {
    expect(STATIC_ROUTE_PATHS).toContain("/achados");
  });
});

describe("public Amazon page rendering mode", () => {
  it("renders per request, so the runtime Tracking ID is used (not a build-time empty one)", async () => {
    const page = await import("@/app/achados/page");
    expect(page.dynamic).toBe("force-dynamic");
  });
});
