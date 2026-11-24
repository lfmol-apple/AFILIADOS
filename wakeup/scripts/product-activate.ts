import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";
import { isMarketplaceCode } from "@/lib/config/marketplaces";

/**
 * Flips Product.active for one ASIN/marketplace — the only supported way
 * to publish or unpublish a manually-registered product without touching
 * SQL directly. Refuses to touch a dataSource=MOCK row: that catalog is
 * demo data and must never be activated by a human running this tool by
 * mistake (project brief Sprint 7 section 4 — "impedir MOCK acidental").
 *
 * Activating a product does NOT make it public by itself — it still needs
 * PUBLIC_CATALOG_ENABLED=true and (for MANUAL_VERIFIED) MANUAL_PRODUCTS_
 * ENABLED=true, see lib/config/public-catalog.ts.
 *
 * Usage:
 *   npm run product:activate -- --asin B0EXAMPLE1 [--marketplace BR] [--deactivate]
 */
async function main() {
  const { values } = parseArgs({
    options: {
      asin: { type: "string" },
      marketplace: { type: "string", default: "BR" },
      deactivate: { type: "boolean", default: false },
    },
  });

  if (!values.asin) {
    console.error("Uso: npm run product:activate -- --asin <ASIN> [--marketplace BR] [--deactivate]");
    process.exitCode = 1;
    return;
  }
  if (!isMarketplaceCode(values.marketplace ?? "BR")) {
    console.error(`Marketplace desconhecido: "${values.marketplace}".`);
    process.exitCode = 1;
    return;
  }
  const marketplace = (values.marketplace ?? "BR") as "BR" | "US";

  const product = await prisma.product.findUnique({
    where: { provider_marketplace_asin: { provider: "AMAZON", marketplace, asin: values.asin } },
  });
  if (!product) {
    console.error(`Produto não encontrado para ASIN=${values.asin} marketplace=${marketplace}.`);
    process.exitCode = 1;
    return;
  }

  if (product.dataSource === "MOCK") {
    console.error(
      `Recusado: produto ${product.id} tem dataSource=MOCK (dado de demonstração/seed). ` +
        "Produtos MOCK nunca devem ser ativados manualmente — isso violaria a proteção contra catálogo fictício em produção.",
    );
    process.exitCode = 1;
    return;
  }

  const nextActive = !values.deactivate;
  const updated = await prisma.product.update({
    where: { id: product.id },
    data: { active: nextActive },
  });

  console.log(`Produto ${updated.id} (${updated.asin}, ${updated.dataSource}) agora está ${updated.active ? "ACTIVE" : "INATIVO (draft)"}.`);
  if (updated.active) {
    console.log("\nLembrete: isso NÃO torna o produto público por si só.");
    console.log("Ele só aparece publicamente quando, além de active=true:");
    console.log("  PUBLIC_CATALOG_ENABLED=true  e  MANUAL_PRODUCTS_ENABLED=true  (para dataSource=MANUAL_VERIFIED)");
  }
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
