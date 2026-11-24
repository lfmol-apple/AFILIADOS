import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { prisma } from "@/lib/db";
import {
  createPriceAlert,
  validatePriceAlertInput,
} from "@/lib/services/price-alert";
import { buildConfirmationEmail } from "@/lib/services/price-alert-email";
import { sendEmail } from "@/lib/services/email-sender";
import { logger } from "@/lib/observability/logger";

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
    merchantListingId?: unknown;
    targetPrice?: unknown;
    contact?: unknown;
  } | null;

  const productId = typeof body?.productId === "string" ? body.productId : "";
  const merchantListingId =
    typeof body?.merchantListingId === "string" ? body.merchantListingId : "";
  const targetPrice =
    typeof body?.targetPrice === "number"
      ? body.targetPrice
      : Number(body?.targetPrice);
  const contact = typeof body?.contact === "string" ? body.contact : "";

  const validation = validatePriceAlertInput({ targetPrice, contact });
  if ((!productId && !merchantListingId) || (productId && merchantListingId) || !validation.ok) {
    return NextResponse.json(
      {
        error: validation.ok
          ? "Informe exatamente um produto (productId ou merchantListingId)."
          : validation.message,
      },
      { status: 400 },
    );
  }

  let productTitle: string | null = null;
  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.active) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    productTitle = product.title;
  } else {
    const listing = await prisma.merchantListing.findUnique({
      where: { id: merchantListingId },
      include: { canonicalProduct: { select: { title: true } } },
    });
    if (!listing || !listing.active) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }
    productTitle = listing.canonicalProduct?.title ?? listing.externalId;
  }

  const alert = productId
    ? await createPriceAlert({ productId, targetPrice, contact })
    : await createPriceAlert({ merchantListingId, targetPrice, contact });

  let emailSent = false;
  if (!alert.confirmedAt && alert.confirmationToken && env.RESEND_API_KEY) {
    const confirmUrl = `${env.NEXT_PUBLIC_SITE_URL}/api/price-alerts/confirm/${alert.confirmationToken}`;
    const email = buildConfirmationEmail({
      productTitle,
      targetPrice,
      confirmUrl,
    });
    try {
      await sendEmail({ to: contact, ...email });
      emailSent = true;
    } catch (err) {
      logger.warn("price_alert.confirmation_email_failed", { message: String(err) });
    }
  }

  return NextResponse.json(
    {
      status: "pending_confirmation",
      alertId: alert.id,
      message: emailSent
        ? "Alerta criado! Confira seu e-mail para confirmar."
        : "Alerta criado. A confirmação por e-mail será enviada quando o provedor de e-mail estiver configurado.",
    },
    { status: 202 },
  );
}
