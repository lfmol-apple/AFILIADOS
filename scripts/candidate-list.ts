import { parseArgs } from "node:util";
import { prisma } from "@/lib/db";

/**
 * Lists ProductCandidate rows for operational review, ordered by
 * internalScore (nulls last, since that field isn't computed yet — see
 * docs/COHORT.md), then most recently created first.
 *
 * Usage:
 *   npm run candidate:list [-- --status CANDIDATE|APPROVED|REJECTED|PROMOTED]
 */
async function main() {
  const { values } = parseArgs({
    options: { status: { type: "string" } },
  });

  const where = values.status ? { status: values.status as "CANDIDATE" | "APPROVED" | "REJECTED" | "PROMOTED" } : {};

  const candidates = await prisma.productCandidate.findMany({
    where,
    orderBy: [{ internalScore: "desc" }, { createdAt: "desc" }],
  });

  if (candidates.length === 0) {
    console.log("Nenhum candidato encontrado com esse filtro.");
    return;
  }

  console.log(`${candidates.length} candidato(s):\n`);
  for (const c of candidates) {
    console.log(`- [${c.status}] ${c.marketplace}  ${c.asin}  score=${c.internalScore ?? "—"}`);
    console.log(`    título de trabalho: ${c.workingTitle}`);
    console.log(`    rationale: ${c.rationale}`);
    console.log(`    categoria sugerida: ${c.categoryHint ?? "(nenhuma)"}`);
    if (c.productId) console.log(`    promovido -> productId: ${c.productId}`);
    console.log("");
  }
}

main()
  .catch((err) => {
    console.error("Erro inesperado:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
