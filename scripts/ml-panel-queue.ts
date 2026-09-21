import { writeFileSync } from "node:fs";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { buildQueue, QUEUE_RULES } from "@/lib/services/ml-panel-queue";

/**
 * Evaluates every product pasted from the ML affiliate panel and writes the
 * "generate link" queue to docs/ML_LINK_QUEUE.md. Products already on the
 * public site are detected from the live sitemap. Usage:
 *   npx tsx scripts/ml-panel-queue.ts
 */
async function siteSlugs(): Promise<string[]> {
  const xml = await (
    await fetch("https://precocaindo.com.br/sitemap.xml")
  ).text();
  return [...xml.matchAll(/\/produto\/([^<]+)</g)].map((m) =>
    decodeURIComponent(m[1]!),
  );
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function main() {
  const slugs = await siteSlugs();
  const { queue, skipped } = buildQueue(ML_PANEL_PICKS, slugs);
  const lines: string[] = [
    "# Fila para gerar link (Mercado Livre)",
    "",
    `Gerado em ${new Date().toISOString().slice(0, 10)} a partir de ${ML_PANEL_PICKS.length} produtos colados do painel de afiliados.`,
    "Como usar: no painel, procure o título e clique em **Compartilhar** para gerar o link; depois cadastre no admin.",
    "",
    `Regras: comissão ≥ ${pct(QUEUE_RULES.minRate)}, nota ≥ ${QUEUE_RULES.minRating}, vendas ≥ +${QUEUE_RULES.minSold}, ainda fora do site.`,
    "Ordem = comissão × demanda (vendas) × preço (limitado a R$ 300, por conversão). Não mexe na ordem pública do site.",
    "",
    "| # | Comissão | Ganho/venda | Vendas | Preço | Produto | Obs. |",
    "|---|---|---|---|---|---|---|",
  ];
  queue.forEach(({ pick, verdict }, i) => {
    lines.push(
      `| ${i + 1} | ${pct(pick.rate)}${pick.extras ? " ⚡" : ""} | ${brl(verdict.earningPerSale)} | +${pick.sold} | ${brl(pick.price)} | ${pick.title} | ${verdict.reasons.join("; ")} |`,
    );
  });
  lines.push(
    "",
    '⚡ = campanha temporária ("Ganhos extras").',
    "",
    `## Fora da fila (${skipped.length})`,
    "",
  );
  for (const { pick, verdict } of skipped) {
    if (verdict.status === "skip")
      lines.push(`- ${pick.title} — ${verdict.reason}`);
  }
  writeFileSync("docs/ML_LINK_QUEUE.md", lines.join("\n") + "\n");
  console.log(
    `Fila: ${queue.length} | fora: ${skipped.length} | já no site: ${skipped.filter((s) => s.verdict.status === "skip" && s.verdict.reason === "já está no site").length}`,
  );
}
main();
