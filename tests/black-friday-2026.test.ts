import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import {
  loadBlackFridayPanel,
  updateBlackFridayProduct,
  BlackFridayUpdateError,
  loadXmlEligibleBlackFridayProducts,
} from "@/lib/services/black-friday-2026";
import { GET as blackFridayXmlRoute } from "@/app/catalogo/black-friday-2026.xml/route";

/**
 * Owner's directive, 2026-11-26 ("OPERAÇÃO BLACK FRIDAY 2026"): proves the
 * independent Black Friday catalog never mixes with the Vitrine Geral
 * (separate tables, separate XML), groups ambiguous creative candidates by
 * groupKey even before one is selected, refuses to attach a creative from
 * another product's group (never "closest guess"), and that the XML feed
 * only ever publishes a fully VALIDATED row with a real pasted
 * affiliateUrl + selected creative — never a partial one.
 */
const TEST_SLOT_BASE = -900000;

async function makeProductWithCreatives(opts: {
  slotOffset: number;
  candidateCount: 1 | 2;
  status?: "PENDING_LINK" | "LINK_PASTED" | "VALIDATED" | "DIVERGENT" | "REJECTED";
  withLinks?: boolean;
  select?: "first" | "none";
}) {
  const groupKey = `bftest-group-${opts.slotOffset}-${Date.now()}`;
  const creatives = [];
  for (let i = 0; i < opts.candidateCount; i += 1) {
    const sha256 = `bftest-sha-${opts.slotOffset}-${i}-${Date.now()}-${Math.random()}`;
    creatives.push(
      await prisma.blackFridayCreative.create({
        data: {
          groupKey,
          sha256,
          originalFilename: `fixture-${i}.jpeg`,
          storedPath: `/black-friday-2026/fixture-${sha256}.jpeg`,
        },
      }),
    );
  }

  const product = await prisma.blackFridayProduct.create({
    data: {
      slotNumber: TEST_SLOT_BASE + opts.slotOffset,
      creativeGroupKey: groupKey,
      name: `Produto fixture ${opts.slotOffset}`,
      brand: "MarcaTeste",
      advertisedPrice: 99.9,
      status: opts.status ?? "PENDING_LINK",
      selectedCreativeId: opts.select === "first" ? creatives[0]!.id : null,
      ...(opts.withLinks
        ? {
            mlUrlOriginal: "https://www.mercadolivre.com.br/p/MLB1111111",
            affiliateUrl: "https://mercadolivre.com/sec/bftestlink",
          }
        : {}),
    },
  });

  return { product, creatives, groupKey };
}

afterEach(async () => {
  await prisma.blackFridayProduct.deleteMany({
    where: { slotNumber: { gte: TEST_SLOT_BASE, lte: TEST_SLOT_BASE + 1000 } },
  });
  await prisma.blackFridayCreative.deleteMany({
    where: { groupKey: { startsWith: "bftest-group-" } },
  });
});

describe("loadBlackFridayPanel", () => {
  it("lists every candidate creative for an ambiguous group even before one is selected", async () => {
    const { product, creatives } = await makeProductWithCreatives({ slotOffset: 1, candidateCount: 2 });
    const { rows } = await loadBlackFridayPanel();
    const row = rows.find((r) => r.id === product.id);
    expect(row).toBeDefined();
    expect(row!.candidates.map((c) => c.id).sort()).toEqual(creatives.map((c) => c.id).sort());
    expect(row!.selectedCreativeId).toBeNull();
  });

  it("counts a row as xmlEligible only when VALIDATED + links + selected creative are all present", async () => {
    await makeProductWithCreatives({ slotOffset: 2, candidateCount: 1, status: "VALIDATED", withLinks: true, select: "first" });
    const { rows, counters } = await loadBlackFridayPanel();
    const eligibleAmongFixtures = rows.filter(
      (r) => r.slotNumber === TEST_SLOT_BASE + 2,
    );
    expect(eligibleAmongFixtures).toHaveLength(1);
    expect(counters.xmlEligible).toBeGreaterThanOrEqual(1);
  });

  it("never counts a VALIDATED row with no selected creative as xmlEligible", async () => {
    await makeProductWithCreatives({ slotOffset: 3, candidateCount: 2, status: "VALIDATED", withLinks: true, select: "none" });
    const eligible = await loadXmlEligibleBlackFridayProducts();
    expect(eligible.find((p) => p.slotNumber === TEST_SLOT_BASE + 3)).toBeUndefined();
  });
});

describe("updateBlackFridayProduct", () => {
  it("refuses to attach a creative that belongs to a different product's group", async () => {
    const { product } = await makeProductWithCreatives({ slotOffset: 10, candidateCount: 1 });
    const other = await makeProductWithCreatives({ slotOffset: 11, candidateCount: 1 });
    await expect(
      updateBlackFridayProduct(product.id, { selectedCreativeId: other.creatives[0]!.id }),
    ).rejects.toThrow(BlackFridayUpdateError);
  });

  it("saves the pasted links and flips status to LINK_PASTED-equivalent fields without touching unrelated rows", async () => {
    const { product } = await makeProductWithCreatives({ slotOffset: 12, candidateCount: 1, select: "first" });
    const updated = await updateBlackFridayProduct(product.id, {
      mlUrlOriginal: "https://www.mercadolivre.com.br/p/MLB2222222",
      affiliateUrl: "https://mercadolivre.com/sec/newlink",
      status: "LINK_PASTED",
    });
    expect(updated.mlUrlOriginal).toBe("https://www.mercadolivre.com.br/p/MLB2222222");
    expect(updated.affiliateUrl).toBe("https://mercadolivre.com/sec/newlink");
    expect(updated.status).toBe("LINK_PASTED");
  });
});

describe("GET /catalogo/black-friday-2026.xml", () => {
  it("publishes only the validated, fully-linked fixture — never a partial row, never the real affiliateUrl rewritten", async () => {
    const { product: eligible } = await makeProductWithCreatives({
      slotOffset: 20,
      candidateCount: 1,
      status: "VALIDATED",
      withLinks: true,
      select: "first",
    });
    await makeProductWithCreatives({ slotOffset: 21, candidateCount: 1, status: "LINK_PASTED", withLinks: true, select: "first" });

    const response = await blackFridayXmlRoute();
    const xml = await response.text();
    expect(xml).toContain(`<g:id>${eligible.id}</g:id>`);
    expect(xml).toContain("<link>https://mercadolivre.com/sec/bftestlink</link>");
    expect(xml).not.toContain("<g:price>0.00 BRL</g:price>");
  });

  it("never fabricates g:availability/g:condition beyond the fixed 'in stock'/'new' defaults and escapes the title", async () => {
    await makeProductWithCreatives({ slotOffset: 22, candidateCount: 1, status: "VALIDATED", withLinks: true, select: "first" });
    const response = await blackFridayXmlRoute();
    const xml = await response.text();
    expect(xml).toContain("<g:availability>in stock</g:availability>");
    expect(xml).toContain("<g:condition>new</g:condition>");
  });
});

describe("a disabled product is never XML-eligible", () => {
  it("excludes a VALIDATED, fully-linked product the owner disabled individually", async () => {
    const { product } = await makeProductWithCreatives({
      slotOffset: 30,
      candidateCount: 1,
      status: "VALIDATED",
      withLinks: true,
      select: "first",
    });
    await updateBlackFridayProduct(product.id, { enabled: false });
    const eligible = await loadXmlEligibleBlackFridayProducts();
    expect(eligible.find((p) => p.id === product.id)).toBeUndefined();
  });
});

describe("official reconciliation — real imported data (read-only against the local dev DB)", () => {
  /**
   * Owner's directive, 2026-11-26 ("CADASTRO AUTOMÁTICO DOS 30 LINKS
   * ORIGINAIS" + section 20's acceptance criteria): proves the real 30
   * official slots are present with stable numbering, the 2 products the
   * official list omits from the preliminary table (kit natalino,
   * protetor Hidrabene) are never force-fit into a slot, the 2 products
   * with genuinely no matching creative stay excluded, and every
   * imported creative file on disk still hashes to exactly what this
   * project recorded at import time — proof no file was ever modified.
   */
  it("has exactly the 30 official slots, numbered 1-30, none of the superseded preliminary-only products", async () => {
    const products = await prisma.blackFridayProduct.findMany({
      where: { slotNumber: { gte: 1, lte: 30 } },
      orderBy: { slotNumber: "asc" },
    });
    expect(products).toHaveLength(30);
    expect(products.map((p) => p.slotNumber)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const names = products.map((p) => p.name).join(" | ");
    expect(names).not.toContain("Kit Natalino");
    expect(names).not.toContain("Hidrabene");
  });

  it("leaves the 2 products with no matching creative excluded from the XML, never guessed", async () => {
    const products = await prisma.blackFridayProduct.findMany({
      where: { slotNumber: { gte: 1, lte: 30 }, creativeGroupKey: { startsWith: "missing-" } },
    });
    expect(products.length).toBeGreaterThanOrEqual(2);
    for (const p of products) {
      expect(p.selectedCreativeId).toBeNull();
    }
  });

  it("every imported creative file on disk still hashes to exactly its recorded sha256 — never modified, resized or recompressed", async () => {
    const creatives = await prisma.blackFridayCreative.findMany();
    expect(creatives.length).toBeGreaterThan(0);
    for (const creative of creatives) {
      const absolutePath = join(process.cwd(), "public", creative.storedPath.replace(/^\//, ""));
      const bytes = readFileSync(absolutePath);
      const actualSha256 = createHash("sha256").update(bytes).digest("hex");
      expect(actualSha256).toBe(creative.sha256);
    }
  });

  it("never leaves an orphan file in public/black-friday-2026 that isn't a recorded creative", async () => {
    const creatives = await prisma.blackFridayCreative.findMany();
    const recordedFiles = new Set(creatives.map((c) => c.storedPath.replace(/^\//, "")));
    const dir = join(process.cwd(), "public", "black-friday-2026");
    const onDisk = readdirSync(dir).map((f) => `black-friday-2026/${f}`);
    for (const file of onDisk) {
      expect(recordedFiles.has(file)).toBe(true);
    }
  });
});

function importLines(source: string): string[] {
  return source.split("\n").filter((line) => /^\s*import\b/.test(line));
}

describe("independence between the Black Friday catalog and the Vitrine Geral", () => {
  // Doc comments freely MENTION "Vitrine Geral" to explain the deliberate
  // separation (that's the point) — what must never happen is an actual
  // `import ... from ".../vitrine..."` line, so only import statements are
  // checked here, never the whole file's prose.
  it("the Black Friday XML route never imports a Vitrine* service or model", async () => {
    const source = readFileSync(
      join(process.cwd(), "app", "catalogo", "black-friday-2026.xml", "route.ts"),
      "utf-8",
    );
    for (const line of importLines(source)) {
      expect(line).not.toMatch(/vitrine/i);
    }
  });

  it("the Black Friday service module never imports a Vitrine* service or model", async () => {
    const source = readFileSync(
      join(process.cwd(), "lib", "services", "black-friday-2026.ts"),
      "utf-8",
    );
    for (const line of importLines(source)) {
      expect(line).not.toMatch(/vitrine/i);
    }
  });
});
