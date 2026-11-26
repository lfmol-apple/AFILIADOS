import { siteConfig } from "@/lib/config/site";
import { env } from "@/lib/config/env";
import { loadXmlEligibleBlackFridayProducts, BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } from "@/lib/services/black-friday-2026";

export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO", section 7, "XML independente"): identical structure to
 * /catalogo/black-friday-2026.xml, pointed at this campaign's own 15
 * products — fully independent feed, never sharing a row with the first
 * campaign or the Vitrine Geral. Same direct-link default and the same
 * domain-verified redirect fallback (its own env var,
 * BLACK_FRIDAY_FIM_DO_MUNDO_CATALOG_LINK_MODE), same open risk about
 * Meta's domain-verification requirement for `link` — see the first
 * campaign's own route for the full reasoning, unchanged here.
 */
export async function GET() {
  const products = await loadXmlEligibleBlackFridayProducts(BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN);

  const items = products.map((p) => {
    const price = p.currentPrice !== null ? Number(p.currentPrice) : Number(p.advertisedPrice);
    const link =
      env.BLACK_FRIDAY_FIM_DO_MUNDO_CATALOG_LINK_MODE === "redirect"
        ? `${siteConfig.url}/go/black-friday-fim-do-mundo/${p.id}`
        : p.affiliateUrl!;
    return (
      `<item>` +
      `<g:id>${escapeXml(p.id)}</g:id>` +
      `<title>${escapeXml(p.name)}</title>` +
      `<description>${escapeXml(p.brand ? `${p.brand} — ${p.name}` : p.name)}</description>` +
      `<link>${escapeXml(link)}</link>` +
      `<g:image_link>${escapeXml(`${siteConfig.url}${p.selectedCreative!.storedPath}`)}</g:image_link>` +
      `<g:price>${price.toFixed(2)} BRL</g:price>` +
      `<g:availability>in stock</g:availability>` +
      `<g:brand>${escapeXml(p.brand ?? "Genérica")}</g:brand>` +
      `<g:condition>new</g:condition>` +
      `</item>`
    );
  });

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">` +
    `<channel>` +
    `<title>PreçoCaindo — Black Friday Fim do Mundo</title>` +
    `<link>${escapeXml(siteConfig.url)}</link>` +
    `<description>Catálogo manual da segunda campanha Black Friday — Fim do Mundo</description>` +
    items.join("") +
    `</channel>` +
    `</rss>`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
