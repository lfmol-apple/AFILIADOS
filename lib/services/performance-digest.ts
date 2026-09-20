import type { PerformanceDashboardData } from "@/lib/queries/performance-dashboard";

export interface DigestContent {
  subject: string;
  html: string;
  text: string;
}

function pct(cur: number, prev: number): string {
  if (prev === 0)
    return cur === 0 ? "sem variação" : "novo (sem base anterior)";
  const d = ((cur - prev) / prev) * 100;
  const arrow = d > 1 ? "↑" : d < -1 ? "↓" : "→";
  return `${arrow} ${Math.abs(d).toFixed(0)}% vs 7 dias anteriores`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Pure formatting of the same numbers /admin/desempenho shows — no DB, no
 * network — so the email can never disagree with the page. Real counts only:
 * no commission or conversion estimate (Amazon sales live in Amazon's panel). */
export function buildPerformanceDigest(
  data: PerformanceDashboardData,
  siteUrl: string,
  now: Date = new Date(),
): DigestContent {
  const { summary } = data;
  const day = now.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const yesterdayKey = new Date(now.getTime() - 24 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
  const clicksYesterday = data.clicksDaily
    .filter((r) => r.day === yesterdayKey)
    .reduce((sum, r) => sum + r.clicks, 0);
  const pageviewsYesterday =
    data.pageviewsDaily.find((r) => r.day === yesterdayKey)?.pageviews ?? 0;

  const top = data.topProducts.slice(0, 5);
  const sources = data.clickSources.slice(0, 5);
  const partialHeavy = data.automation.filter((j) => {
    const total = j.success + j.partial + j.failed;
    return total > 0 && j.partial / total > 0.5;
  });
  const failed = data.automation.filter((j) => j.failed > 0);

  const lines: string[] = [
    `Desempenho PreçoCaindo — ${day}`,
    "",
    `Cliques (7d): ${summary.clicksLast7d} (${pct(summary.clicksLast7d, summary.clicksPrev7d)})`,
    `Pageviews (7d): ${summary.pageviewsLast7d} (${pct(summary.pageviewsLast7d, summary.pageviewsPrev7d)})`,
    `Ontem: ${clicksYesterday} cliques, ${pageviewsYesterday} pageviews`,
    `Cliques totais: ${summary.totalClicks}`,
    `Links ativos: ML ${summary.activeLinksMl} · Shopee ${summary.activeLinksShopee} · fila ML pendente ${summary.pendingLinksMl}`,
    "",
    "Produtos mais clicados (14d):",
    ...(top.length
      ? top.map(
          (p, i) =>
            `${i + 1}. [${p.merchant === "MERCADO_LIVRE" ? "ML" : p.merchant === "SHOPEE" ? "Shopee" : "Amazon"}] ${p.title} — ${p.clicks}`,
        )
      : ["Sem cliques no período."]),
    "",
    "Origem dos cliques (14d):",
    ...(sources.length
      ? sources.map((s) => `- ${s.source} (${s.pageType}): ${s.clicks}`)
      : ["Sem cliques no período."]),
  ];
  if (failed.length || partialHeavy.length) {
    lines.push("", "Atenção na automação:");
    for (const j of failed)
      lines.push(`- ${j.job}: ${j.failed} execução(ões) FAILED`);
    for (const j of partialHeavy)
      lines.push(`- ${j.job}: maioria das execuções PARTIAL`);
  }
  lines.push(
    "",
    `Painel completo: ${siteUrl}/admin/desempenho`,
    "Vendas e comissões reais estão no painel de cada marketplace; este e-mail só traz cliques e tráfego do site.",
  );
  const text = lines.join("\n");

  const html = `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#111">
<h2 style="margin:0 0 4px">Desempenho PreçoCaindo</h2>
<p style="margin:0 0 16px;color:#666">${esc(day)}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px">
<tr><td style="padding:6px 0">Cliques (7d)</td><td style="text-align:right"><b>${summary.clicksLast7d}</b> <span style="color:#666">${esc(pct(summary.clicksLast7d, summary.clicksPrev7d))}</span></td></tr>
<tr><td style="padding:6px 0">Pageviews (7d)</td><td style="text-align:right"><b>${summary.pageviewsLast7d}</b> <span style="color:#666">${esc(pct(summary.pageviewsLast7d, summary.pageviewsPrev7d))}</span></td></tr>
<tr><td style="padding:6px 0">Ontem</td><td style="text-align:right">${clicksYesterday} cliques · ${pageviewsYesterday} pageviews</td></tr>
<tr><td style="padding:6px 0">Links ativos</td><td style="text-align:right">ML ${summary.activeLinksMl} · Shopee ${summary.activeLinksShopee} · fila ${summary.pendingLinksMl}</td></tr>
</table>
<h3 style="margin:20px 0 6px;font-size:14px">Produtos mais clicados (14d)</h3>
<ol style="margin:0;padding-left:20px;font-size:14px">${
    top.length
      ? top.map((p) => `<li>${esc(p.title)} — <b>${p.clicks}</b></li>`).join("")
      : "<li>Sem cliques no período.</li>"
  }</ol>
${
  failed.length || partialHeavy.length
    ? `<p style="margin:16px 0 0;padding:10px;background:#fff4e0;border-radius:8px;font-size:13px">⚠️ Automação: ${esc(
        [
          ...failed.map((j) => `${j.job} com FAILED`),
          ...partialHeavy.map((j) => `${j.job} majoritariamente PARTIAL`),
        ].join(" · "),
      )}</p>`
    : ""
}
<p style="margin:20px 0 0;font-size:13px"><a href="${esc(siteUrl)}/admin/desempenho">Abrir o painel completo</a></p>
<p style="margin:8px 0 0;font-size:12px;color:#888">Só cliques e tráfego do site. Vendas e comissões reais ficam no painel de cada marketplace.</p>
</div>`;

  return {
    subject: `PreçoCaindo — ${summary.clicksLast7d} cliques em 7d, ${clicksYesterday} ontem`,
    html,
    text,
  };
}
