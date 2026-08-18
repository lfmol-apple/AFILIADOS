import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { registerManualVerifiedProduct } from "@/lib/services/manual-product-registration";

/**
 * Registers one dataSource=MANUAL_VERIFIED Product, as a draft
 * (active=false) — the only supported way to register a real product
 * without the Creators API and without touching SQL directly (project
 * brief Sprint 7 section 4).
 *
 * Usage:
 *   npm run product:add -- --asin B0EXAMPLE1 --title "Nome editorial" \
 *     --category eletronicos --description "Texto editorial próprio." \
 *     [--marketplace BR] [--brand Marca] [--slug slug-manual]
 */
async function main() {
  const { values } = parseArgs({
    options: {
      asin: { type: "string" },
      title: { type: "string" },
      description: { type: "string" },
      category: { type: "string" },
      marketplace: { type: "string", default: "BR" },
      brand: { type: "string" },
      slug: { type: "string" },
    },
  });

  if (!values.asin || !values.title || !values.description || !values.category) {
    console.error(
      "Uso: npm run product:add -- --asin <ASIN> --title \"<título editorial>\" " +
        "--category <slug-da-categoria> --description \"<conteúdo editorial>\" " +
        "[--marketplace BR] [--brand <marca>] [--slug <slug>]",
    );
    process.exitCode = 1;
    return;
  }

  const result = await registerManualVerifiedProduct({
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

  console.log("\nProduto criado como DRAFT (active=false, dataSource=MANUAL_VERIFIED):");
  console.log(`  id:          ${result.product.id}`);
  console.log(`  asin:        ${result.product.asin}`);
  console.log(`  marketplace: ${result.product.marketplace}`);
  console.log(`  slug:        ${result.product.slug}`);
  console.log(`\nPágina (quando ativado e o catálogo estiver ligado): /produto/${result.product.slug}`);
  console.log(`Link afiliado, gerado automaticamente (nenhum cadastro manual necessário): /go/amazon/${result.product.asin}`);
  if (result.affiliateUrlPreview) {
    console.log(`  destino real: ${result.affiliateUrlPreview}`);
  }
  console.log("\nPróximo passo, depois de revisar os dados:");
  console.log(`  npm run product:activate -- --asin ${result.product.asin} --marketplace ${result.product.marketplace}`);
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
