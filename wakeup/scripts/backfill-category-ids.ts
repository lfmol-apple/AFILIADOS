import { prisma } from "../lib/db";
import { mapDomainIdToCategorySlug } from "../lib/services/commercial-intelligence/ml-domain-category-map";

/**
 * One-off backfill, 2026-11-20 ("Etapa 4 — Categorias e Sazonalidade"):
 * every CanonicalProduct already has Mercado Livre's real domain_id
 * captured in `specifications.domainId` — this just resolves it to our
 * own real Category.id for every row where categoryId is still null.
 * Never invents a category: unmatched/missing domainId resolves to the
 * real "outros" category (see ml-domain-category-map.ts), never left
 * silently null and never guessed beyond what the real domain_id says.
 *
 * Idempotent (only touches rows where categoryId IS NULL) and additive
 * (never clears an existing categoryId) — safe to re-run.
 */
async function main() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

  const rows = await prisma.canonicalProduct.findMany({
    where: { categoryId: null },
    select: { id: true, specifications: true },
  });

  const byCategory: Record<string, number> = {};
  let updated = 0;
  let skippedNoDomain = 0;

  for (const row of rows) {
    const spec = row.specifications as { domainId?: string | null } | null;
    const domainId = spec?.domainId ?? null;
    const slug = mapDomainIdToCategorySlug(domainId);
    const categoryId = slugToId.get(slug);
    if (!categoryId) {
      skippedNoDomain += 1;
      continue;
    }
    await prisma.canonicalProduct.update({ where: { id: row.id }, data: { categoryId } });
    updated += 1;
    byCategory[slug] = (byCategory[slug] ?? 0) + 1;
  }

  console.log(
    `BACKFILL_CATEGORY_IDS done: ${JSON.stringify({ totalRowsWithNullCategory: rows.length, updated, skippedNoDomain, byCategory })}`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exitCode = 1;
});
