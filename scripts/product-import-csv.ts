import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { isValidAsin } from "@/lib/amazon/policy-guard";
import { registerManualVerifiedProduct } from "@/lib/services/manual-product-registration";
import { slugify } from "@/lib/services/slug";

interface CsvProductRow {
  asin: string;
  title: string;
  category: string;
  description: string;
  brand?: string;
  slug?: string;
}

const REQUIRED_COLUMNS = ["asin", "title", "category", "description"];

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      values.push(value.trim());
      value = "";
      continue;
    }
    value += char;
  }

  values.push(value.trim());
  return values;
}

function parseCsv(raw: string): CsvProductRow[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missing = REQUIRED_COLUMNS.filter(
    (column) => !headers.includes(column),
  );
  if (missing.length > 0) {
    throw new Error(`CSV sem coluna obrigatória: ${missing.join(", ")}`);
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, headerIndex) => [header, values[headerIndex] ?? ""]),
    ) as Record<keyof CsvProductRow, string>;

    const asin = row.asin?.trim().toUpperCase();
    if (!isValidAsin(asin)) {
      throw new Error(`Linha ${index + 2}: ASIN inválido: "${row.asin}"`);
    }

    return {
      asin,
      title: row.title?.trim(),
      category: row.category?.trim(),
      description: row.description?.trim(),
      brand: row.brand?.trim() || undefined,
      slug: row.slug?.trim() || undefined,
    };
  });
}

async function ensureCategory(categoryInput: string): Promise<string> {
  const slug = slugify(categoryInput);
  const existingBySlug = await prisma.category.findUnique({ where: { slug } });
  if (existingBySlug) return existingBySlug.slug;

  const existingByName = await prisma.category.findFirst({
    where: { name: categoryInput },
  });
  if (existingByName) return existingByName.slug;

  const category = await prisma.category.create({
    data: {
      name: categoryInput,
      slug,
    },
  });
  return category.slug;
}

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: "string" },
      marketplace: { type: "string", default: "BR" },
    },
  });

  if (!values.file) {
    console.error(
      "Uso: npm run product:import-csv -- --file data/produtos-br.csv [--marketplace BR]",
    );
    process.exitCode = 1;
    return;
  }

  const rows = parseCsv(readFileSync(values.file, "utf8"));
  if (rows.length === 0) {
    console.error("CSV vazio: informe pelo menos uma linha de produto.");
    process.exitCode = 1;
    return;
  }

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const categorySlug = await ensureCategory(row.category);
    const result = await registerManualVerifiedProduct({
      asin: row.asin,
      marketplace: values.marketplace ?? "BR",
      title: row.title,
      description: row.description,
      categorySlug,
      brand: row.brand ?? null,
      slug: row.slug ?? null,
    });

    if (result.ok) {
      created += 1;
      console.log(`CRIADO ${row.asin} /produto/${result.product.slug}`);
      continue;
    }

    if (result.error.code === "ALREADY_EXISTS") {
      skipped += 1;
      console.log(`IGNORADO ${row.asin}: já existe`);
      continue;
    }

    failed += 1;
    console.error(
      `FALHOU ${row.asin}: [${result.error.code}] ${result.error.message}`,
    );
  }

  console.log("\nImportação concluída:");
  console.log(`  criados:  ${created}`);
  console.log(`  ignorados: ${skipped}`);
  console.log(`  falhas:   ${failed}`);
  console.log("\nProdutos criados ficam como draft. Revise e ative com:");
  console.log("  npm run product:activate -- --asin <ASIN> --marketplace BR");
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
