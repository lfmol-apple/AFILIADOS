import { prisma } from "@/lib/db";
import type { ConsentChoice } from "@prisma/client";

export type { ConsentChoice } from "@prisma/client";

export interface ConsentChoices {
  analytics: ConsentChoice;
  marketing: ConsentChoice;
}

/**
 * LGPD consent, persisted server-side keyed by a pseudonymous subject id
 * (never an email/account id — see prisma/schema.prisma ConsentRecord).
 * ESSENTIAL is not modeled here because it isn't a choice: it's whatever
 * PreçoCaindo needs to function (e.g. this very consent record) and is
 * never gated behind a banner (project brief Part M).
 */
export async function getConsent(subjectId: string): Promise<ConsentChoices | null> {
  const record = await prisma.consentRecord.findUnique({ where: { subjectId } });
  if (!record) return null;
  return { analytics: record.analytics, marketing: record.marketing };
}

/**
 * Persists a consent decision. Refusing non-essential categories must be
 * exactly as functional as accepting them — this function makes no
 * distinction in how DENIED vs GRANTED is handled (project brief: "Recusar
 * deve ser tão funcional quanto aceitar").
 */
export async function setConsent(subjectId: string, choices: ConsentChoices): Promise<ConsentChoices> {
  const record = await prisma.consentRecord.upsert({
    where: { subjectId },
    create: { subjectId, ...choices },
    update: { ...choices },
  });
  return { analytics: record.analytics, marketing: record.marketing };
}

export function isGranted(choice: ConsentChoice | undefined): boolean {
  return choice === "GRANTED";
}
