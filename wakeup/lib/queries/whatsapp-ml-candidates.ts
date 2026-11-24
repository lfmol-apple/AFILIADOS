import { prisma } from "@/lib/db";
import { loadMerchantListingFactsByListingId } from "@/lib/services/merchant-listing-facts";

/** Prefix for the synthetic PanelPick id this candidate gets handed out
 * under (app/api/admin/ml-panel-links/route.ts strips it back off to
 * find the real catalogId) — distinguishes a DB-backed group find from a
 * source-code ML_PANEL_PICKS row, which never starts with this. */
export const WHATSAPP_CANDIDATE_ID_PREFIX = "whatsapp:";

export interface WhatsAppMlCandidate {
  catalogId: string;
  title: string;
  price: number | null;
  productUrl: string;
  capturedAt: string;
}

/**
 * Mercado Livre products found in a promo group (lib/services/
 * whatsapp-group-harvest.ts) that don't have an ACTIVE link yet — shown
 * as their own section in /admin/fila-links, never merged into
 * rankAllForLinking's own ranked queue: that ranking is calibrated on
 * the panel's real "+N vendidos"/commission numbers, which a group find
 * simply doesn't have (there's no honest non-zero value to give it), so
 * merging would either fabricate data or silently bury every fresh group
 * find under the much larger existing backlog — exactly the "em alta de
 * setembro não é em alta hoje" problem the owner already flagged.
 */
export async function loadWhatsAppMlCandidates(limit = 50): Promise<WhatsAppMlCandidate[]> {
  const rows = await prisma.merchantListing.findMany({
    where: {
      active: true,
      merchant: { code: "MERCADO_LIVRE" },
      signals: { some: { source: "whatsapp_group_candidate" } },
      OR: [{ affiliateLink: null }, { affiliateLink: { status: { not: "ACTIVE" } } }],
    },
    include: {
      canonicalProduct: { select: { title: true } },
      signals: {
        where: { source: "whatsapp_group_candidate" },
        orderBy: { observedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const results: WhatsAppMlCandidate[] = [];
  for (const r of rows) {
    if (!r.canonicalProduct?.title) continue;
    const raw = r.signals[0]?.raw as { productUrl?: string; capturedAt?: string } | null;
    const facts = await loadMerchantListingFactsByListingId(r.id);
    results.push({
      catalogId: r.externalId,
      title: r.canonicalProduct.title,
      price: facts?.currentPrice ?? null,
      productUrl: raw?.productUrl ?? r.productUrl ?? `https://www.mercadolivre.com.br/p/${r.externalId}`,
      capturedAt: raw?.capturedAt ?? r.createdAt.toISOString(),
    });
  }
  return results;
}
