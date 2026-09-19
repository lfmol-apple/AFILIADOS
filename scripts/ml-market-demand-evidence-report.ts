import "dotenv/config";
import { performance } from "node:perf_hooks";
import { prisma } from "@/lib/db";
import {
  calculateMarketDemandEvidenceBatch,
  compareLatestObservedRank,
  compareMarketDemandEvidence,
  type MarketDemandEvidence,
  type MarketDemandObservation,
} from "@/lib/services/market-demand-evidence";

const REPORT_LIMIT = 10;
const TOP_LIMIT = 50;

interface HighlightRaw {
  categoryId?: string;
}

async function main() {
  const scriptStartedAt = performance.now();
  const memoryStart = process.memoryUsage().heapUsed;

  const queryStartedAt = performance.now();
  const signals = await prisma.merchantListingSignal.findMany({
    where: {
      source: "mercado_livre_highlights",
      bestsellerRank: { not: null },
      merchantListing: { merchant: { code: "MERCADO_LIVRE" } },
    },
    select: {
      bestsellerRank: true,
      observedAt: true,
      raw: true,
      merchantListing: {
        select: {
          id: true,
          externalId: true,
          canonicalProductId: true,
          canonicalProduct: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
    orderBy: { observedAt: "asc" },
  });
  const queryMs = performance.now() - queryStartedAt;

  const observations: MarketDemandObservation[] = signals.map((signal) => {
    const listing = signal.merchantListing;
    const raw = signal.raw as HighlightRaw | null;
    return {
      productKey: listing.canonicalProductId ?? listing.id,
      title: listing.canonicalProduct?.title ?? listing.externalId,
      bestsellerRank: signal.bestsellerRank,
      observedAt: signal.observedAt,
      categoryId: raw?.categoryId ?? null,
    };
  });

  const evidence = calculateMarketDemandEvidenceBatch(observations);
  evidence.sort(compareMarketDemandEvidence);

  const categories = new Set(evidence.flatMap((item) => item.categoriesObserved));
  const observationCounts = evidence
    .map((item) => item.totalBestsellerObservations)
    .sort((a, b) => a - b);
  const firstObservedAt = minDate(evidence.map((item) => item.firstObservedAt));
  const lastObservedAt = maxDate(evidence.map((item) => item.lastObservedAt));
  const memoryEnd = process.memoryUsage().heapUsed;
  const totalMs = performance.now() - scriptStartedAt;

  printHeading("MERCADO LIVRE MARKET DEMAND EVIDENCE V1");
  console.log("Modo: READ-ONLY. Fonte exclusiva: MerchantListingSignal.source = mercado_livre_highlights.");
  console.log(
    "Identidade: canonicalProductId quando existe; fallback para MerchantListing.id da linha de catálogo quando ainda não há canonical.",
  );
  console.log("Observação: ausência de signal não é interpretada como queda, perda de ranking ou zero.");

  printHeading("A. Universo analisado");
  console.log(`Signals lidos: ${signals.length}`);
  console.log(`Produtos agregados: ${evidence.length}`);
  console.log(`Categorias observadas: ${categories.size}`);
  console.log(`Período: ${formatDate(firstObservedAt)} -> ${formatDate(lastObservedAt)}`);
  console.log(`Mediana observações/produto: ${formatNumber(percentile(observationCounts, 0.5))}`);
  console.log(`p75 observações/produto: ${formatNumber(percentile(observationCounts, 0.75))}`);
  console.log(`p90 observações/produto: ${formatNumber(percentile(observationCounts, 0.9))}`);
  console.log(`Máximo observações/produto: ${observationCounts.at(-1) ?? 0}`);

  printHeading("B. Top 50 — evidência persistente");
  console.log(
    "Critério: totalBestsellerObservations DESC, top3Observations DESC, top10Observations DESC, bestObservedRank ASC, lastObservedAt DESC.",
  );
  printEvidenceTable(evidence.slice(0, TOP_LIMIT));

  printHeading("C. 10 possíveis falsos positivos de snapshot");
  const snapshotFalsePositiveCandidates = evidence
    .filter((item) => item.totalBestsellerObservations === 1 && (item.bestObservedRank ?? 999) <= 3)
    .sort((a, b) => (a.bestObservedRank ?? 999) - (b.bestObservedRank ?? 999) || compareLatestObservedRank(a, b))
    .slice(0, REPORT_LIMIT);
  printEvidenceTable(snapshotFalsePositiveCandidates);

  printHeading("D. 10 fortes persistentes");
  const strongPersistent = evidence
    .filter((item) => item.repeatedEvidence === "HIGH")
    .sort(compareMarketDemandEvidence)
    .slice(0, REPORT_LIMIT);
  printEvidenceTable(strongPersistent);

  printHeading("E. 10 baixa confiança");
  const lowConfidence = evidence
    .filter((item) => item.confidence === "LOW")
    .sort(compareLatestObservedRank)
    .slice(0, REPORT_LIMIT);
  printEvidenceTable(lowConfidence);

  printHeading("F. Comparação snapshot atual vs evidência persistente");
  const snapshotTop = [...evidence].sort(compareLatestObservedRank).slice(0, REPORT_LIMIT);
  console.log("Snapshot atual, olhando só latestObservedBestsellerRank:");
  printEvidenceTable(snapshotTop);
  console.log("");
  console.log("Evidência persistente:");
  printEvidenceTable(evidence.slice(0, REPORT_LIMIT));

  printHeading("G. Exemplos concretos");
  printExample("#1 isolado", evidence.find((item) => item.totalBestsellerObservations === 1 && item.bestObservedRank === 1));
  printExample(
    "Top 10 recorrente",
    evidence.find((item) => item.top10Observations >= 4 && item.top3Observations < item.top10Observations),
  );
  printExample("Top 3 persistente", evidence.find((item) => item.top3Observations >= 5));
  printExample(
    "Ranking médio persistente",
    evidence.find((item) => item.totalBestsellerObservations >= 5 && item.top10Observations === 0),
  );

  printHeading("H. Performance");
  console.log(`Tempo da query: ${formatNumber(queryMs)} ms`);
  console.log(`Tempo total do script: ${formatNumber(totalMs)} ms`);
  console.log(`Memória heap aproximada usada: ${formatNumber((memoryEnd - memoryStart) / 1024 / 1024)} MB`);

  printHeading("I. Próxima mudança recomendada");
  console.log(
    "Usar esta evidência apenas como coluna/ordenador auxiliar futuro na fila ML: priorizar HIGH/MEDIUM antes de #1 isolado, sem alterar MonetizationScore nem publicar automaticamente.",
  );
}

function printEvidenceTable(items: MarketDemandEvidence[]) {
  if (items.length === 0) {
    console.log("  (nenhum item encontrado)");
    return;
  }

  for (const [index, item] of items.entries()) {
    console.log(
      `${String(index + 1).padStart(2, "0")}. ${item.title ?? item.productKey} | latest #${item.latestObservedBestsellerRank} | best #${item.bestObservedRank} | obs ${item.totalBestsellerObservations} | top3 ${item.top3Observations} | top10 ${item.top10Observations} | repeated ${item.repeatedEvidence} | confidence ${item.confidence}`,
    );
  }
}

function printExample(label: string, item: MarketDemandEvidence | undefined) {
  if (!item) {
    console.log(`${label}: (não encontrado nos dados atuais)`);
    return;
  }
  console.log(`${label}: ${item.title ?? item.productKey}`);
  console.log(`  ${item.explanation}`);
}

function printHeading(title: string) {
  console.log("");
  console.log(title);
  console.log("-".repeat(title.length));
}

function minDate(dates: Array<Date | null>): Date | null {
  const values = dates.filter((date): date is Date => date !== null);
  if (values.length === 0) return null;
  return new Date(Math.min(...values.map((date) => date.getTime())));
}

function maxDate(dates: Array<Date | null>): Date | null {
  const values = dates.filter((date): date is Date => date !== null);
  if (values.length === 0) return null;
  return new Date(Math.max(...values.map((date) => date.getTime())));
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (sortedValues.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower]!;
  const weight = index - lower;
  return sortedValues[lower]! * (1 - weight) + sortedValues[upper]! * weight;
}

function formatDate(date: Date | null): string {
  return date ? date.toISOString() : "(sem observação)";
}

function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

main()
  .catch((error) => {
    console.error("Falha ao gerar MarketDemandEvidence:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
