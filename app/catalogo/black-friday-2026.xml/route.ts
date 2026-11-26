import { siteConfig } from "@/lib/config/site";
import { env } from "@/lib/config/env";
import { loadXmlEligibleBlackFridayProducts } from "@/lib/services/black-friday-2026";

export const dynamic = "force-dynamic";

/**
 * Owner's directive, 2026-11-26 ("OPERAÇÃO BLACK FRIDAY 2026", section 6):
 * independent Meta catalog feed for the Black Friday 2026 campaign — fixed
 * address, content regenerated on every fetch from BlackFridayProduct,
 * never touching VitrineSelection or the Vitrine Geral feed
 * (mercado-livre.xml). Only a product with status VALIDATED, a pasted
 * affiliateUrl + mlUrlOriginal, AND a chosen creative is ever included
 * (loadXmlEligibleBlackFridayProducts' own rule) — never a partial row.
 *
 * `g:link` points straight at the real Mercado Livre affiliate URL by
 * default (owner's explicit requirement, section 7: "o consumidor não
 * deverá ser obrigado a visitar o PreçoCaindo antes de chegar ao Mercado
 * Livre"), unlike the Vitrine Geral feed which redirects through this
 * site's own verified domain. OPEN RISK, flagged for the owner before
 * activation: Meta's Commerce Manager catalog spec has historically
 * required `link` to resolve on the advertiser's OWN verified domain,
 * not a third party's — whether a Mercado Livre affiliate URL is
 * accepted here is unconfirmed (checked again 2026-11-26: no official
 * Meta source confirms or forbids it either way) and must be checked in
 * Commerce Manager's Diagnostics tab before this feed is registered for
 * real. The fallback is already built and one env var away:
 * BLACK_FRIDAY_2026_CATALOG_LINK_MODE="redirect" switches every item to
 * app/go/black-friday-2026/[id]/route.ts, the same domain-verified
 * 302-redirect pattern the Vitrine Geral feed already uses (one extra
 * click, but unambiguously compliant) — no code change needed the
 * moment Diagnostics flags an item.
 */
export async function GET() {
  const products = await loadXmlEligibleBlackFridayProducts();

  const items = products.map((p) => {
    const price = p.currentPrice !== null ? Number(p.currentPrice) : Number(p.advertisedPrice);
    const link =
      env.BLACK_FRIDAY_2026_CATALOG_LINK_MODE === "redirect"
        ? `${siteConfig.url}/go/black-friday-2026/${p.id}`
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
    `<title>PreçoCaindo — Black Friday 2026</title>` +
    `<link>${escapeXml(siteConfig.url)}</link>` +
    `<description>Catálogo manual da campanha Black Friday 2026</description>` +
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
