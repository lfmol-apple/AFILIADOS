import { prisma } from "@/lib/db";
import { getDemandIntelligenceSnapshot } from "@/lib/queries/demand-intelligence-v2";
import {
  formatDemandMomentum,
  type DemandConfidence,
  type DemandMomentum,
} from "@/lib/services/demand-intelligence-v2";

function parseLimit(): number {
  const raw = process.argv.find((arg) => arg.startsWith("--limit="));
  if (!raw) return 50;
  const parsed = Number(raw.split("=")[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

function rowLine(row: {
  title: string;
  currentRank: number | null;
  averageRank: number | null;
  bestRank: number | null;
  top10Share: number;
  consecutiveTop10Cycles: number;
  rankedCycles: number;
  demandMomentum: DemandMomentum;
  confidence: DemandConfidence;
  demandScoreV2: number;
  v1Position: number | null;
  v2Position: number | null;
}) {
  return `- ${row.title} | atual ${row.currentRank ? `#${row.currentRank}` : "—"} | média ${
    row.averageRank ?? "—"
  } | melhor ${row.bestRank ? `#${row.bestRank}` : "—"} | top10 ${Math.round(
    row.top10Share * 100,
  )}% | top10 seguidos ${row.consecutiveTop10Cycles} | obs ${
    row.rankedCycles
  } | momentum ${formatDemandMomentum(row.demandMomentum)} ${
    row.demandMomentum
  } | confidence ${row.confidence} | V2 ${row.demandScoreV2} | V1 ${
    row.v1Position ?? "—"
  } | V2pos ${row.v2Position ?? "—"}`;
}

function sectionRows<T>(title: string, rows: T[], render: (row: T) => string) {
  console.log(`\n## ${title}\n`);
  if (rows.length === 0) {
    console.log("- Sem casos suficientes na amostra atual.");
    return;
  }
  for (const row of rows.slice(0, 50)) console.log(render(row));
}

async function main() {
  const limit = parseLimit();
  const snapshot = await getDemandIntelligenceSnapshot({
    limit,
    candidateLimit: 800,
    historySignalsPerListing: 50,
  });

  console.log(`# Demand Intelligence V2 — SHADOW\n`);
  console.log(`Gerado em: ${snapshot.generatedAt.toISOString()}`);
  console.log(`Tempo: ${snapshot.elapsedMs}ms`);
  console.log(`Candidatos: ${snapshot.candidateListings}`);
  console.log(`Listings hidratados: ${snapshot.hydratedListings}`);
  console.log(`Signals carregados: ${snapshot.historySignalsLoaded}`);

  console.log(`\n## A. Dados disponíveis\n`);
  console.log(`- ML rank signals persistidos: ${snapshot.audit.mlRankedSignals}`);
  console.log(`- Shopee rank signals comparáveis: ${snapshot.audit.shopeeRankedSignals}`);
  console.log(`- Listings com algum ranking histórico: ${snapshot.audit.rankedListings}`);
  console.log(`- Signals com ranking histórico: ${snapshot.audit.rankedSignals}`);
  console.log("- Timestamp por observação: MerchantListingSignal.observedAt.");
  console.log("- Identidade estável: MerchantListing.id e, quando existe, CanonicalProduct.id.");
  console.log("- Shopee hoje possui sinais de produto/oferta, mas não ranking marketplace comparável a ML.");
  console.log(
    `- AffiliateClick total ${snapshot.audit.affiliateClicks.total}; com merchant ${snapshot.audit.affiliateClicks.withMerchant}; com MerchantListing ${snapshot.audit.affiliateClicks.withMerchantListing}; com CanonicalProduct ${snapshot.audit.affiliateClicks.withCanonicalProduct}; legado Product ${snapshot.audit.affiliateClicks.withLegacyProduct}.`,
  );
  console.log(
    `- PageView total ${snapshot.audit.internalSignals.pageViews}; SearchEvent total ${snapshot.audit.internalSignals.searches}. PageView depende de consentimento e não deve ser comparado diretamente a clique afiliado.`,
  );

  console.log(`\n## B. Demand Intelligence implementada\n`);
  console.log("- currentRank, bestRank, averageRank, observações, Top 10, consecutivos, idade, delta, velocidade, persistência e momentum são derivados de MerchantListingSignal.");
  console.log("- Ausência só é calculável quando existe uma observação sem rank no input; os dados atuais de ML registram presença/rank, não o universo completo de ausências por ciclo.");

  console.log(`\n## C. DemandScore V2\n`);
  console.log("- Escala 0-100: 35% rank atual, 30% persistência, 20% momentum, 10% recência, 5% confiança histórica.");
  console.log("- Não usa comissão, link ACTIVE, MonetizationScore, conversão, merchant preferido ou valor econômico.");

  sectionRows("D. Top 50 pelo DemandScore V2", snapshot.topByDemandScoreV2, rowLine);
  sectionRows("D. Top 50 pelo sinal atual V1", snapshot.topByCurrentSignalV1, rowLine);

  console.log(`\n## E. Comparação V1 × V2\n`);
  console.log(`- Presentes nos dois Top 50: ${snapshot.comparison.sharedTop50}`);
  sectionRows("Promovidos pelo V2", snapshot.comparison.promotedByV2, rowLine);
  sectionRows("Rebaixados pelo V2", snapshot.comparison.demotedByV2, rowLine);

  sectionRows("F. Fortes persistentes", snapshot.topByDemandScoreV2.filter((row) => row.top10Share >= 0.8 && row.rankedCycles >= 5), rowLine);
  sectionRows("F. Acelerando", snapshot.comparison.accelerating, rowLine);
  sectionRows("F. Falsos positivos / #1 frágil", snapshot.comparison.weakOneShotRankOnes, rowLine);
  sectionRows("F. Perdendo força", snapshot.comparison.losingStrength, rowLine);

  console.log(`\n## G. Performance\n`);
  console.log(`- Query limitada a ${snapshot.candidateListings} candidatos recentes com rank ML.`);
  console.log(`- Janela por listing: até 50 signals de ranking.`);
  console.log(`- Signals carregados nesta execução: ${snapshot.historySignalsLoaded}.`);
  console.log(`- Tempo total medido no processo: ${snapshot.elapsedMs}ms.`);

  console.log(`\n## H. Testes\n`);
  console.log("- Rodar: npm run test -- tests/demand-intelligence-v2.test.ts");
  console.log("- Suite completa depende do Postgres local localhost:5433.");

  console.log(`\n## I. Próxima etapa recomendada\n`);
  console.log("- Só considerar produção depois de comparar estabilidade por alguns ciclos e revisar manualmente os promovidos/rebaixados.");
  console.log("- Se o admin ficar lento com volume maior, transformar a execução SHADOW em job offline antes de qualquer uso produtivo.");

  console.log(`\n## J. Segurança\n`);
  console.log("- MonetizationScore intacto; OpportunityScore intacto; Publication Gate intacto; scanner intacto; links intactos; cron intacto; nenhuma decisão pública afetada.");

  console.log(`\n**DEMAND INTELLIGENCE V2 — SHADOW PRONTO PARA AUDITORIA**`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
