import { describe, expect, it } from "vitest";
import {
  calculateReadingMinutes,
  countWords,
  getGuideBySlug,
  guideText,
  GUIDES,
} from "@/lib/editorial/guides";

describe("editorial guides", () => {
  it("publishes at least the 15-guide Amazon approval readiness set", () => {
    expect(GUIDES.length).toBeGreaterThanOrEqual(15);
  });

  it("has unique slugs and complete metadata", () => {
    expect(new Set(GUIDES.map((guide) => guide.slug)).size).toBe(GUIDES.length);
    for (const guide of GUIDES) {
      expect(guide.title.length).toBeGreaterThan(20);
      expect(guide.description.length).toBeGreaterThan(60);
      expect(guide.author).toBe("Equipe PreçoCaindo");
      expect(guide.seo.title).toBeTruthy();
      expect(guide.seo.description.length).toBeGreaterThan(60);
      expect(guide.sections.length).toBeGreaterThanOrEqual(8);
      expect(Date.parse(guide.publishedAt)).not.toBeNaN();
      expect(Date.parse(guide.updatedAt)).not.toBeNaN();
    }
  });

  it("includes the required editorial themes from the approval sprint", () => {
    const requiredSlugs = [
      "como-saber-se-uma-promocao-e-realmente-boa",
      "como-comparar-precos-sem-cair-em-falso-desconto",
      "como-comparar-preco-por-kg-litro-ou-unidade",
      "menor-preco-historico-o-que-isso-realmente-significa",
      "como-saber-se-vale-a-pena-comprar-agora",
      "como-funciona-o-historico-de-precos",
      "parcelado-ou-a-vista-como-comparar-corretamente",
      "quando-vale-a-pena-esperar-a-black-friday",
      "como-comparar-embalagens-de-tamanhos-diferentes",
      "como-escolher-uma-air-fryer-sem-olhar-apenas-o-preco",
      "como-comparar-celulares-alem-do-preco",
      "como-escolher-um-robo-aspirador-pelo-custo-beneficio",
      "como-comparar-televisores-antes-de-comprar",
      "como-economizar-em-compras-recorrentes",
      "como-o-score-precocaindo-ajuda-a-avaliar-uma-oportunidade",
    ];

    for (const slug of requiredSlugs) {
      expect(getGuideBySlug(slug)?.slug).toBe(slug);
    }
  });

  it("integrates the required public tools into contextual guides", () => {
    expect(
      getGuideBySlug("como-comparar-preco-por-kg-litro-ou-unidade")?.tool,
    ).toBe("unit-comparison");
    expect(
      getGuideBySlug("parcelado-ou-a-vista-como-comparar-corretamente")?.tool,
    ).toBe("installment-comparison");
    expect(
      getGuideBySlug("como-comparar-precos-sem-cair-em-falso-desconto")?.tool,
    ).toBe("real-discount");
  });

  it("calculates reading time from real word count instead of manual strings", () => {
    for (const guide of GUIDES) {
      const wordCount = countWords(guideText(guide));
      expect(guide.wordCount).toBe(wordCount);
      expect(guide.readingMinutes).toBe(calculateReadingMinutes(wordCount));
      expect(guide.readingTime).toBe(`${guide.readingMinutes} min`);
    }
  });

  it("prevents regression to thin editorial pages", () => {
    for (const guide of GUIDES) {
      const minimum = guide.depth === "deep" ? 800 : 600;
      expect(guide.wordCount, guide.slug).toBeGreaterThanOrEqual(minimum);
      expect(guide.sections.length, guide.slug).toBeGreaterThanOrEqual(8);
      expect(
        guide.sections.reduce(
          (count, section) => count + section.body.length,
          0,
        ),
        guide.slug,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it("keeps the guide set from reading like one repeated template", () => {
    const openingParagraphs = GUIDES.map((guide) => guide.sections[0]?.body[0]);
    expect(new Set(openingParagraphs).size).toBe(GUIDES.length);

    const allHeadings = GUIDES.flatMap((guide) =>
      guide.sections.map((section) => section.heading),
    );
    const repeatedHeadingCount = allHeadings.length - new Set(allHeadings).size;
    expect(repeatedHeadingCount / allHeadings.length).toBeLessThan(0.35);
  });

  it("never repeats a whole body paragraph across two different guides", () => {
    // This is the check that would have caught the real regression found in
    // this sprint: a shared buildDepthSections() template injected
    // byte-identical paragraphs into every guide, varying only a short
    // "focus" phrase in the heading — the two checks above (opening
    // paragraph, heading text) never touched that shared body text, so they
    // stayed green the whole time. Every paragraph belongs to exactly one
    // guide now.
    const owner = new Map<string, string>();
    const duplicates: string[] = [];
    for (const guide of GUIDES) {
      for (const section of guide.sections) {
        for (const paragraph of section.body) {
          if (paragraph.length < 40) continue; // trivial/short lines aren't meaningful signal
          const existingOwner = owner.get(paragraph);
          if (existingOwner && existingOwner !== guide.slug) {
            duplicates.push(`"${paragraph.slice(0, 60)}..." in both ${existingOwner} and ${guide.slug}`);
          } else {
            owner.set(paragraph, guide.slug);
          }
        }
      }
    }
    expect(duplicates).toEqual([]);
  });

  it("keeps cross-guide sentence overlap low (no near-duplicate/template phrasing)", () => {
    // Simple, non-ML similarity heuristic: count shared 6-word sequences
    // (shingles) between every pair of guides. A handful of shared short
    // connective phrases ("antes de comprar", "checklist final") is normal
    // house style; dozens of identical 6-word runs between two specific
    // guides would mean they're substantially copy-pasted from each other.
    function shingles(text: string): Set<string> {
      const words = text
        .toLowerCase()
        .match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];
      const result = new Set<string>();
      for (let i = 0; i + 6 <= words.length; i++) {
        result.add(words.slice(i, i + 6).join(" "));
      }
      return result;
    }

    const guideShingles = GUIDES.map((guide) => ({
      slug: guide.slug,
      shingles: shingles(guide.sections.flatMap((s) => s.body).join(" ")),
    }));

    const offenders: string[] = [];
    for (let i = 0; i < guideShingles.length; i++) {
      for (let j = i + 1; j < guideShingles.length; j++) {
        let shared = 0;
        for (const shingle of guideShingles[i].shingles) {
          if (guideShingles[j].shingles.has(shingle)) shared += 1;
        }
        if (shared > 5) {
          offenders.push(`${guideShingles[i].slug} <-> ${guideShingles[j].slug}: ${shared} shared 6-word sequences`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("only links to related guides that exist", () => {
    for (const guide of GUIDES) {
      for (const slug of guide.relatedSlugs) {
        expect(getGuideBySlug(slug)?.slug).toBe(slug);
      }
    }
  });
});
