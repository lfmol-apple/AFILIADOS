import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import { prisma } from "@/lib/db";
import { isPushConfigured } from "@/lib/push/send";

async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

/** Saves/refreshes a browser's Web Push subscription for the owner's
 * access-notification alert. Gated on an already-valid /admin session, same
 * as every other /api/admin/* route. */
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        error: "VAPID_PRIVATE_KEY/NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured",
      },
      { status: 503 },
    );
  }
  const parsed = subscriptionSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid subscription" },
      { status: 400 },
    );
  }
  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: request.headers.get("user-agent")?.slice(0, 300),
    },
    update: { p256dh: keys.p256dh, auth: keys.auth, lastSeenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

const deleteSchema = z.object({ endpoint: z.string().url() });

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  await prisma.pushSubscription
    .delete({ where: { endpoint: parsed.data.endpoint } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
