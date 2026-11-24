import { env } from "@/lib/config/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailNotConfiguredError extends Error {}

export function isEmailConfigured(): boolean {
  return env.RESEND_API_KEY.length > 0 && env.DAILY_DIGEST_EMAIL_TO.length > 0;
}

/** Sends one transactional email through Resend's HTTP API. Throws instead
 * of silently skipping, so a misconfigured cron shows up as a FAILED run. */
export async function sendEmail(
  email: OutgoingEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<{ id: string }> {
  if (!env.RESEND_API_KEY) {
    throw new EmailNotConfiguredError("RESEND_API_KEY is not set.");
  }

  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.DAILY_DIGEST_EMAIL_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Resend responded ${response.status}: ${detail}`);
  }
  const body = (await response.json().catch(() => ({}))) as { id?: string };
  return { id: body.id ?? "unknown" };
}
