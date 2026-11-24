import { prisma } from "../lib/db";
import { evaluateCanonicalEquivalence } from "../lib/services/canonical-product-equivalence";

/**
 * Owner's directive, 2026-11-21 ("Produtos Philco — aprovado com
 * restrições"): "Prepare o script retroativo somente em modo dry-run.
 * Não execute fusões nem exclusões de registros existentes." This script
 * has NO write path at all — not a flag to disable, structurally
 * impossible to mutate anything. It only reads existing CanonicalProduct
 * rows (grouped by normalized brand+model) and reports, using the exact
 * same evaluateCanonicalEquivalence() the forward-ingestion fix uses,
 * which pairs WOULD be reused (confirmed equivalent), which are
 * confirmed genuinely distinct variants, and which are ambiguous and
 * need a human to look at the real listings before any decision.
 *
 * Run: npx tsx scripts/merge-canonical-products-by-model.ts
 */

async function main() {
  console.log("=== Relatório de fusão retroativa de produtos canônicos (SOMENTE LEITURA — nenhuma escrita) ===\n");

  const candidates = await prisma.canonicalProduct.findMany({
    where: { brand: { not: null }, model: { not: null } },
    select: { id: true, slug: true, title: true, brand: true, model: true, specifications: true, _count: { select: { listings: true } } },
  });

  const groups = new Map<string, typeof candidates>();
  for (const c of candidates) {
    const key = `${c.brand!.trim().toLowerCase()}::${c.model!.trim().toLowerCase()}`;
    const group = groups.get(key) ?? [];
    group.push(c);
    groups.set(key, group);
  }

  let wouldReuseCount = 0;
  let distinctCount = 0;
  let ambiguousCount = 0;

  for (const [key, group] of groups) {
    if (group.length < 2) continue; // nothing to compare

    console.log(`--- Grupo marca+modelo: ${key} (${group.length} canônicos reais) ---`);
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i]!;
        const b = group[j]!;
        const specsA = a.specifications as { variantAttributes?: Record<string, string> } | null;
        const specsB = b.specifications as { variantAttributes?: Record<string, string> } | null;
        const verdict = evaluateCanonicalEquivalence(
          { brand: a.brand, model: a.model, variantAttributes: specsA?.variantAttributes ?? {} },
          { brand: b.brand, model: b.model, variantAttributes: specsB?.variantAttributes ?? {} },
        );

        if (verdict.decision === "equivalent") wouldReuseCount += 1;
        else if (verdict.decision === "distinct") distinctCount += 1;
        else ambiguousCount += 1;

        console.log(
          `  [${verdict.decision.toUpperCase()}] "${a.title}" (${a.slug}, ${a._count.listings} anúncio(s)) <-> "${b.title}" (${b.slug}, ${b._count.listings} anúncio(s))`,
        );
        console.log(`    motivo: ${verdict.reason}`);
        if (verdict.decision === "equivalent") {
          console.log(`    AÇÃO QUE SERIA NECESSÁRIA (NÃO EXECUTADA): fundir listings de "${b.slug}" em "${a.slug}" — requer autorização específica e separada.`);
        }
      }
    }
    console.log("");
  }

  console.log("=== Resumo (nenhuma alteração foi feita) ===");
  console.log(`Pares que SERIAM reusados/fundidos se autorizado: ${wouldReuseCount}`);
  console.log(`Pares confirmados como variantes comerciais distintas (nunca fundir): ${distinctCount}`);
  console.log(`Pares ambíguos, sem dado de atributo suficiente (precisam de revisão humana): ${ambiguousCount}`);
  console.log("\nEste script não grava nada. Qualquer fusão real exige autorização específica e separada.");

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
