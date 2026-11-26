import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedBlackFridayHost } from "@/lib/services/black-friday-2026";

/**
 * Owner's directive, 2026-11-26 ("correções de segurança da validação
 * dos links" + the fallback discussed in env.ts's own
 * BLACK_FRIDAY_2026_CATALOG_LINK_MODE doc comment): the domain-verified
 * fallback for the Black Friday catalog's `link` field, in case Meta's
 * Commerce Manager rejects a direct third-party affiliate URL. A plain
 * 302, same shape as app/go/[merchant]/[externalId]/route.ts — no
 * interstitial, no click write (this campaign has no click-tracking
 * table of its own; that's a separate feature, not part of resolving
 * this specific validation blocker). Re-checks the host allowlist here
 * too, even though updateBlackFridayProduct already enforced it at save
 * time — the same defense-in-depth rule as isXmlEligible.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const product = await prisma.blackFridayProduct.findUnique({ where: { id } });

  if (!product || !product.enabled || product.status !== "VALIDATED" || !product.affiliateUrl) {
    return NextResponse.json({ error: "Produto não disponível." }, { status: 404 });
  }

  let destination: URL;
  try {
    destination = new URL(product.affiliateUrl);
  } catch {
    return NextResponse.json({ error: "Link de afiliado inválido." }, { status: 404 });
  }
  if (!isAllowedBlackFridayHost(destination)) {
    return NextResponse.json({ error: "Destino não autorizado." }, { status: 404 });
  }

  return NextResponse.redirect(destination.toString(), { status: 302 });
}
