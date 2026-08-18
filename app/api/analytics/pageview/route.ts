import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

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
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { referrer, ...rest } = parsed.data;

  await prisma.pageView.create({
    data: { ...rest, referrerDomain: extractHostname(referrer) },
  });

  return NextResponse.json({ ok: true });
}
