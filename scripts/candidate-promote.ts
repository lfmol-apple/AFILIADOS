import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { promoteCandidateToProduct } from "@/lib/services/candidate-promotion";

/**
 * Promotes one ProductCandidate to a real, draft Product
 * (dataSource=MANUAL_VERIFIED, active=false) — deliberately requires
 * --confirm so this can never run as an accidental/scripted side effect
 * (project brief Sprint 7 section 5 — "promoção deve ser deliberada").
 *
 * Usage:
 *   npm run candidate:promote -- --asin B0EXAMPLE1 --marketplace BR \
 *     --title "Título editorial final" --category eletronicos \
 *     --description "Conteúdo editorial próprio, revisado." --confirm
 */
async function main() {
  const { values } = parseArgs({
    options: {
      asin: { type: "string" },
      marketplace: { type: "string", default: "BR" },
      title: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      slug: { type: "string" },
      brand: { type: "string" },
      confirm: { type: "boolean", default: false },
    },
  });

  if (!values.asin || !values.title || !values.description || !values.category) {
    console.error(
      "Uso: npm run candidate:promote -- --asin <ASIN> --marketplace BR --title \"...\" " +
        "--category <slug> --description \"...\" --confirm",
    );
    process.exitCode = 1;
    return;
  }
  if (!values.confirm) {
    console.error(
      "Recusado: promoção exige --confirm — confirme explicitamente que você revisou e verificou " +
        "manualmente o ASIN, o título e a categoria antes de criar um Product real.",
    );
    process.exitCode = 1;
    return;
  }

  const result = await promoteCandidateToProduct({
    asin: values.asin,
    marketplace: values.marketplace ?? "BR",
    title: values.title,
    description: values.description,
    categorySlug: values.category,
    brand: values.brand ?? null,
    slug: values.slug ?? null,
  });

  if (!result.ok) {
    console.error(`Falhou: [${result.error.code}] ${result.error.message}`);
    if (result.error.code === "CATEGORY_NOT_FOUND") {
      console.error(`Categorias disponíveis: ${result.error.availableCategorySlugs.join(", ") || "(nenhuma)"}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("\nCandidato promovido — Product criado como DRAFT (active=false, dataSource=MANUAL_VERIFIED):");
  console.log(`  id:          ${result.product.id}`);
  console.log(`  asin:        ${result.product.asin}`);
  console.log(`  marketplace: ${result.product.marketplace}`);
  console.log(`  slug:        ${result.product.slug}`);
  console.log(`\nPróximo passo, depois de revisar:`);
  console.log(`  npm run product:activate -- --asin ${result.product.asin} --marketplace ${result.product.marketplace}`);
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
