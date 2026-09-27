import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isOwnerRequest } from "@/lib/admin/owner-traffic";
import { describePageviewForOwner } from "@/lib/analytics/pageview-notification";
import { sendPushToOwner } from "@/lib/push/send";
import { logger } from "@/lib/observability/logger";

const schema = z.object({
  pageType: z.string().min(1).max(50),
  pageSlug: z.string().min(1).max(300),
  productId: z.string().optional(),
  /** Full referrer URL from the client — we only ever persist its
   * hostname, never the full URL (which could carry query strings from
   * the referring page). */
  referrer: z.string().optional(),
  utmSource: z.string().max(100).optional(),
  utmMedium: z.string().max(100).optional(),
  utmCampaign: z.string().max(100).optional(),
  sessionId: z.string().min(1).max(200),
});

function extractHostname(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

/**
 * Records a first-party pageview. Consent is enforced client-side
 * (components/analytics-beacon.tsx only calls this when ANALYTICS consent
 * is GRANTED) — this endpoint's own job is just validation and storage.
 * Never reads or stores the request IP.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  // The owner browsing while logged in to /admin must not count as traffic.
  if (await isOwnerRequest(request)) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const { referrer, ...rest } = parsed.data;

  // Checked BEFORE inserting this pageview: is this session's first one
  // today? Owner notifications fire once per new visitor per day, not once
  // per page — see /admin/notificacoes.
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  let isFirstOfSessionToday = false;
  try {
    const priorToday = await prisma.pageView.findFirst({
      where: { sessionId: rest.sessionId, createdAt: { gte: todayStart } },
      select: { id: true },
    });
    isFirstOfSessionToday = !priorToday;
  } catch {
    // Best-effort — worst case we skip a notification, never break the beacon.
  }

  try {
    await prisma.pageView.create({
      data: { ...rest, referrerDomain: extractHostname(referrer) },
    });
  } catch (error) {
    console.error("analytics.pageview_not_persisted", error);
    return NextResponse.json({ ok: true, stored: false }, { status: 202 });
  }

  if (isFirstOfSessionToday) {
    const { label, url } = describePageviewForOwner(
      rest.pageType,
      rest.pageSlug,
    );
    void sendPushToOwner({
      title: "🔔 Novo visitante no PreçoCaindo",
      body: label,
      url,
    }).catch((error) =>
      logger.warn("push.owner_notify_failed", { error: String(error) }),
    );
  }

  return NextResponse.json({ ok: true });
}
