"use client";

const SUBJECT_COOKIE = "pc_subject";
const CONSENT_COOKIE = "pc_consent";
const ONE_YEAR_DAYS = 365;

export type ClientConsentChoice = "GRANTED" | "DENIED" | "UNSET";

export interface CachedConsent {
  analytics: ClientConsentChoice;
  marketing: ClientConsentChoice;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === "undefined") return;
  const expires = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  ).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/** A pseudonymous, purely functional identifier — never an email or
 * account id — used only to pair a consent choice with a browser. */
export function getOrCreateSubjectId(): string {
  const existing = readCookie(SUBJECT_COOKIE);
  if (existing) return existing;
  const id = crypto.randomUUID();
  writeCookie(SUBJECT_COOKIE, id, ONE_YEAR_DAYS);
  return id;
}

export function readCachedConsent(): CachedConsent | null {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedConsent>;
    if (parsed.analytics && parsed.marketing) return parsed as CachedConsent;
    return null;
  } catch {
    return null;
  }
}

export function writeCachedConsent(consent: CachedConsent): void {
  writeCookie(CONSENT_COOKIE, JSON.stringify(consent), ONE_YEAR_DAYS);
}

export async function submitConsent(consent: CachedConsent): Promise<void> {
  const subjectId = getOrCreateSubjectId();
  writeCachedConsent(consent);
  await fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subjectId, ...consent }),
  }).catch(() => {
    // Best-effort persistence — the cookie cache is already the source of
    // truth for this browser's own behavior, so a failed sync here doesn't
    // leave the user's choice unrespected locally.
  });
}
