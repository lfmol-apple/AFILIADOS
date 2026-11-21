import { writeFileSync } from "fs";
import { prisma } from "../lib/db";
import { readAiBase } from "../lib/services/ai-creative-factory/creative-image-store";
import { runQualityControl } from "../lib/services/ai-creative-factory/quality-control";
import { recordCreativeSpend } from "../lib/services/ai-creative-factory/budget";

/**
 * Real, owner-authorized revalidation of all 30 active products' EXISTING
 * creative files, using the corrected auditor (2026-11-20) — never
 * generates a new image. Hard, real budget ceiling enforced IN THIS
 * SCRIPT (the vision check itself has no gate of its own — this is the
 * one real safeguard): stops BEFORE making a call that could push
 * cumulative real spend past MAX_BUDGET_USD, using a conservative
 * per-call estimate (real historical calls ranged $0.0077-$0.0111; 0.015
 * is a safe margin above the observed max).
 *
 * Writes NOTHING to VitrineCreative.qualityStatus — this is a read-only
 * audit. Owner's explicit rule: "Não aprove automaticamente os 19
 * antigos nem os 11 recuperados" — approval is a separate, human
 * decision made from this report.
 */
const MAX_BUDGET_USD = 0.4;
const SAFE_PER_CALL_ESTIMATE_USD = 0.015;

async function main() {
  const active = await prisma.vitrineSelection.findMany({
    where: { status: "ACTIVE" },
    orderBy: { score: "desc" },
    select: { merchantListingId: true, merchantListing: { select: { canonicalProduct: { select: { title: true, brand: true } } } } },
  });

  let cumulativeCost = 0;
  const results: Array<{
    id: string;
    title: string;
    verdict: "APROVADO" | "REPROVADO" | "INCONCLUSIVO" | "NAO_VERIFICADO";
    justification: string;
    fileExists: boolean;
    publicUrlToCheck: string | null;
    costUsd: number;
  }> = [];

  for (const a of active) {
    const title = a.merchantListing.canonicalProduct?.title ?? "(sem título)";

    const creative = await prisma.vitrineCreative.findFirst({
      where: { merchantListingId: a.merchantListingId, kind: "ad_overlay" },
      orderBy: { version: "desc" },
      select: { version: true, originalPhotoUrl: true },
    });

    if (!creative) {
      results.push({ id: a.merchantListingId, title, verdict: "NAO_VERIFICADO", justification: "Nenhum registro de criativo encontrado.", fileExists: false, publicUrlToCheck: null, costUsd: 0 });
      continue;
    }

    const aiBaseBytes = readAiBase(a.merchantListingId, creative.version);
    if (!aiBaseBytes) {
      results.push({ id: a.merchantListingId, title, verdict: "NAO_VERIFICADO", justification: "Arquivo aiBaseImageUrl não encontrado no disco.", fileExists: false, publicUrlToCheck: null, costUsd: 0 });
      continue;
    }

    // Hard stop BEFORE spending — never exceed the real authorized ceiling.
    if (cumulativeCost + SAFE_PER_CALL_ESTIMATE_USD > MAX_BUDGET_USD) {
      results.push({
        id: a.merchantListingId,
        title,
        verdict: "NAO_VERIFICADO",
        justification: `Orçamento de US$ ${MAX_BUDGET_USD.toFixed(2)} esgotado antes desta verificação (gasto acumulado: US$ ${cumulativeCost.toFixed(4)}).`,
        fileExists: true,
        publicUrlToCheck: null,
        costUsd: 0,
      });
      continue;
    }

    const photoRes = await fetch(creative.originalPhotoUrl);
    const photoBuffer = Buffer.from(await photoRes.arrayBuffer());

    const qc = await runQualityControl({
      generatedImageBuffer: aiBaseBytes,
      expectedWidth: 1024,
      expectedHeight: 1536,
      originalPhotoBase64: photoBuffer.toString("base64"),
      title,
    });

    const realCost = qc.visionCheckCostUsd ?? 0;
    cumulativeCost += realCost;
    if (realCost > 0) {
      await recordCreativeSpend({ amountUsd: realCost, note: `Reauditoria visual (auditor corrigido) — ${title.slice(0, 60)}` });
    }

    const verdict = qc.status === "approved" ? "APROVADO" : qc.status === "rejected" ? "REPROVADO" : "INCONCLUSIVO";
    results.push({
      id: a.merchantListingId,
      title,
      verdict,
      justification: qc.notes,
      fileExists: true,
      publicUrlToCheck: `https://precocaindo.com.br/api/vitrine/creative-asset/${a.merchantListingId}-ad_overlay-v${creative.version}.png`,
      costUsd: realCost,
    });

    console.log(`[${results.length}/${active.length}] ${verdict} — ${title.slice(0, 60)} — US$ ${realCost.toFixed(4)} (acumulado: US$ ${cumulativeCost.toFixed(4)})`);
  }

  writeFileSync("/tmp/revalidation-report.json", JSON.stringify(results, null, 2));
  console.log("=== RESUMO ===");
  console.log(
    JSON.stringify({
      total: results.length,
      aprovados: results.filter((r) => r.verdict === "APROVADO").length,
      reprovados: results.filter((r) => r.verdict === "REPROVADO").length,
      inconclusivos: results.filter((r) => r.verdict === "INCONCLUSIVO").length,
      naoVerificados: results.filter((r) => r.verdict === "NAO_VERIFICADO").length,
      custoTotalReal: cumulativeCost.toFixed(4),
    }),
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exitCode = 1;
});
