import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAllowedBlackFridayHost } from "@/lib/services/black-friday-2026";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO"): identical to /go/black-friday-2026/[id]/route.ts — the row is
 * found by its own globally-unique `id`, so this logic is already
 * campaign-agnostic and needed no change at all beyond this new file's
 * own route path (which campaign a row belongs to is irrelevant here:
 * the same host-allowlist + VALIDATED + enabled checks apply either
 * way).
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
