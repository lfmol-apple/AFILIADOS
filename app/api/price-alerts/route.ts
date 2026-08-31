import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db";
import {
  createPriceAlert,
  validatePriceAlertInput,
} from "@/lib/services/price-alert";

export async function POST(request: Request) {
  if (!env.PRICE_ALERTS) {
    return NextResponse.json(
      {
        error: "Alertas de preço ainda não estão habilitados neste ambiente.",
      },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    productId?: unknown;
    targetPrice?: unknown;
    contact?: unknown;
  } | null;

  const productId = typeof body?.productId === "string" ? body.productId : "";
  const targetPrice =
    typeof body?.targetPrice === "number"
      ? body.targetPrice
      : Number(body?.targetPrice);
  const contact = typeof body?.contact === "string" ? body.contact : "";

  const validation = validatePriceAlertInput({ targetPrice, contact });
  if (!productId || !validation.ok) {
    return NextResponse.json(
      { error: validation.ok ? "Produto inválido." : validation.message },
      { status: 400 },
    );
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !product.active) {
    return NextResponse.json(
      { error: "Produto não encontrado." },
      { status: 404 },
    );
  }

  const alert = await createPriceAlert({ productId, targetPrice, contact });

  return NextResponse.json(
    {
      status: "pending_confirmation",
      alertId: alert.id,
      message:
        "Alerta criado. A confirmação por e-mail será enviada quando o provedor de e-mail estiver configurado.",
    },
    { status: 202 },
  );
}
