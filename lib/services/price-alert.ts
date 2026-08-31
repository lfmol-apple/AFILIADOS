import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import type { PriceAlert } from "@prisma/client";

function hashContact(contact: string): string {
  return createHash("sha256")
    .update(contact.trim().toLowerCase())
    .digest("hex");
}

export interface CreatePriceAlertInput {
  productId: string;
  targetPrice: number;
  contact: string;
}

export type PriceAlertValidationResult =
  { ok: true } | { ok: false; message: string };

export function validatePriceAlertInput(input: {
  targetPrice: number;
  contact: string;
}): PriceAlertValidationResult {
  if (!Number.isFinite(input.targetPrice) || input.targetPrice <= 0) {
    return { ok: false, message: "Informe um preço-alvo válido." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contact.trim())) {
    return { ok: false, message: "Informe um e-mail válido." };
  }
  return { ok: true };
}

/**
 * Creates a price alert in the unconfirmed state. Even though
 * `active=true`, an alert only actually triggers once `confirmedAt` is set
 * — see isConfirmed(). Never touches ConsentRecord.marketing: agreeing to a
 * price alert is not marketing consent (project brief Part N). No email is
 * sent here — PRICE_ALERTS=false today, and even once enabled, sending the
 * confirmation email is a separate concern from this data layer.
 */
export async function createPriceAlert(
  input: CreatePriceAlertInput,
): Promise<PriceAlert> {
  const validation = validatePriceAlertInput(input);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const contactHash = hashContact(input.contact);
  const existing = await prisma.priceAlert.findFirst({
    where: {
      productId: input.productId,
      contactHash,
      targetPrice: input.targetPrice,
      active: true,
      triggeredAt: null,
    },
  });
  if (existing) return existing;

  return prisma.priceAlert.create({
    data: {
      productId: input.productId,
      targetPrice: input.targetPrice,
      contact: input.contact,
      contactHash,
      confirmationToken: randomBytes(24).toString("hex"),
      confirmedAt: null,
      active: true,
    },
  });
}

/** Double opt-in confirmation: consumes the token so it can't be reused. */
export async function confirmPriceAlert(
  token: string,
): Promise<PriceAlert | null> {
  const alert = await prisma.priceAlert.findFirst({
    where: { confirmationToken: token, confirmedAt: null },
  });
  if (!alert) return null;

  return prisma.priceAlert.update({
    where: { id: alert.id },
    data: { confirmedAt: new Date(), confirmationToken: null },
  });
}

export function isConfirmed(alert: Pick<PriceAlert, "confirmedAt">): boolean {
  return alert.confirmedAt !== null;
}

export async function cancelPriceAlert(id: string): Promise<PriceAlert> {
  return prisma.priceAlert.update({ where: { id }, data: { active: false } });
}
