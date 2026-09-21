import { writeFileSync } from "node:fs";
import { ML_PANEL_PICKS } from "@/lib/config/ml-panel-picks";
import { rankAllForLinking, QUEUE_RULES } from "@/lib/services/ml-panel-queue";

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
  const { toLink, onSite } = rankAllForLinking(ML_PANEL_PICKS, slugs);
  const recommended = toLink.filter((e) => e.recommended).length;
  const lines: string[] = [
    "# Fila para gerar link (Mercado Livre)",
    "",
    `Gerado em ${new Date().toISOString().slice(0, 10)} a partir de ${ML_PANEL_PICKS.length} produtos colados do painel de afiliados.`,
    "Como usar: no painel, procure o título e clique em **Compartilhar** para gerar o link; depois cadastre no admin.",
    "Todos os produtos colados estão na lista. A ordem só coloca os melhores primeiro.",
    "",
    `Recomendados (nota ≥ ${QUEUE_RULES.minRating} e vendas ≥ +${QUEUE_RULES.minSold}): ${recommended}. Demais: ${toLink.length - recommended}.`,
    'Ordem = valor esperado em reais: comissão em R$ por venda × chance de venda (vendas do produto), com bônus se o painel marca "mais buscado". Não mexe na ordem pública do site.',
    "",
    "| # | Comissão | Ganho/venda | Vendas | Preço | Produto | Obs. |",
    "|---|---|---|---|---|---|---|",
  ];
  toLink.forEach(({ pick, earningPerSale, recommended: rec, notes }, i) => {
    lines.push(
      `| ${i + 1}${rec ? "" : " ↓"} | ${pct(pick.rate)}${pick.extras ? " ⚡" : ""} | ${brl(earningPerSale)} | +${pick.sold} | ${brl(pick.price)} | ${pick.title} | ${notes.join("; ")} |`,
    );
  });
  lines.push(
    "",
    '⚡ = campanha temporária ("Ganhos extras"). ↓ = fora das regras recomendadas, mantido na lista.',
    "",
    `## Já estão no site (${onSite.length}), sem link a gerar`,
    "",
  );
  for (const pick of onSite) lines.push(`- ${pick.title}`);
  writeFileSync("docs/ML_LINK_QUEUE.md", lines.join("\n") + "\n");
  console.log(
    `Para gerar link: ${toLink.length} (recomendados ${recommended}) | já no site: ${onSite.length}`,
  );
}
main();
