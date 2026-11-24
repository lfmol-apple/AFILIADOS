import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";

/**
 * Lists Products for operational review — defaults to dataSource=
 * MANUAL_VERIFIED only, since that's the cohort a human actually needs to
 * manage day to day; pass --dataSource all to see everything (including
 * MOCK), or --dataSource MOCK/AMAZON_API explicitly.
 *
 * Usage:
 *   npm run product:list [-- --dataSource all] [--active true|false] [--marketplace BR]
 */
async function main() {
  const { values } = parseArgs({
    options: {
      dataSource: { type: "string" },
      active: { type: "string" },
      marketplace: { type: "string" },
    },
  });

  const where: Record<string, unknown> = {};
  const dataSourceFilter = values.dataSource ?? "MANUAL_VERIFIED";
  if (dataSourceFilter !== "all") where.dataSource = dataSourceFilter;
  if (values.active !== undefined) where.active = values.active === "true";
  if (values.marketplace) where.marketplace = values.marketplace;

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      asin: true,
      slug: true,
      title: true,
      marketplace: true,
      dataSource: true,
      active: true,
      createdAt: true,
      category: { select: { name: true } },
      offers: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (products.length === 0) {
    console.log("Nenhum produto encontrado com esse filtro.");
    return;
  }

  console.log(`${products.length} produto(s):\n`);
  for (const p of products) {
    console.log(`- [${p.dataSource}] ${p.active ? "ACTIVE" : "draft "}  ${p.marketplace}  ${p.asin}  /produto/${p.slug}`);
    console.log(`    título:    ${p.title}`);
    console.log(`    categoria: ${p.category?.name ?? "(sem categoria)"}`);
    console.log(`    preço:     ${p.offers.length > 0 ? "verificado" : "ainda não cadastrado"}`);
    console.log(`    criado em: ${p.createdAt.toISOString()}`);
    console.log("");
  }
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
