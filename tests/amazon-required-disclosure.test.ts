import { describe, expect, it } from "vitest";
import {
  AMAZON_REQUIRED_DISCLOSURE,
  isDisclosureCompliant,
} from "@/lib/amazon/disclosure";
import { env } from "@/lib/config/env";

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

// The "public Amazon page" (/achados) describe blocks that used to follow
// here were removed 2026-11-24 along with the page itself — owner's
// decision to take the organic public site dormant. See git tag
// archive/preco-caindo-organico-2026-11-24 for the prior version.
