import webpush from "web-push";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

export function isPushConfigured(): boolean {
  return !!env.VAPID_PRIVATE_KEY && !!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
}

export interface OwnerPushPayload {
  title: string;
  body: string;
  /** Opened when the owner taps the notification. Defaults to the site root. */
  url?: string;
}

/**
 * Sends a notification to every browser the owner has subscribed
 * (/admin/notificacoes). Best-effort: never throws — a push failing must
 * never break the request that triggered it (a pageview, a click). A
 * subscription the browser itself revoked (410 Gone, or 404 — the endpoint
 * no longer exists) is deleted so we stop retrying it forever.
 */
export async function sendPushToOwner(
  payload: OwnerPushPayload,
): Promise<void> {
  if (!isPushConfigured()) return;
  ensureConfigured();

  const subscriptions = await prisma.pushSubscription.findMany();
  if (subscriptions.length === 0) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? (error as { statusCode?: number }).statusCode
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => {});
          return;
        }
        logger.warn("push.send_failed", { statusCode: statusCode ?? null });
      }
    }),
  );
}
