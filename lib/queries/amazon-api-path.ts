import { prisma } from "@/lib/db";

export interface AmazonApiPathSnapshot {
  clicksLast30d: number;
  clicksTotal: number;
  productsBySource: { dataSource: string; active: number; total: number }[];
  publishedGuides: number;
}

/** Real counts only. Qualified sales live in Amazon's Associates panel, never
 * in this database — nothing here estimates them (see docs/AMAZON.md). */
export async function getAmazonApiPathSnapshot(): Promise<AmazonApiPathSnapshot> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [clicksLast30d, clicksTotal, sourceRows, activeRows, publishedGuides] =
    await Promise.all([
      prisma.affiliateClick.count({
        where: { provider: "AMAZON", createdAt: { gte: since } },
      }),
      prisma.affiliateClick.count({ where: { provider: "AMAZON" } }),
      prisma.product.groupBy({
        by: ["dataSource"],
        where: { marketplace: "BR", provider: "AMAZON" },
        _count: { _all: true },
      }),
      prisma.product.groupBy({
        by: ["dataSource"],
        where: { marketplace: "BR", provider: "AMAZON", active: true },
        _count: { _all: true },
      }),
      prisma.generatedContent.count({ where: { status: "PUBLISHED" } }),
    ]);

  const activeBySource = new Map(
    activeRows.map((r) => [r.dataSource, r._count._all]),
  );
  return {
    clicksLast30d,
    clicksTotal,
    productsBySource: sourceRows.map((r) => ({
      dataSource: r.dataSource,
      total: r._count._all,
      active: activeBySource.get(r.dataSource) ?? 0,
    })),
    publishedGuides,
  };
}
