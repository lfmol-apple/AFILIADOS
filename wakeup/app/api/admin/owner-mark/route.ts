import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  isAdminRequestAuthorized,
} from "@/lib/admin/auth";
import {
  OWNER_MARK_COOKIE,
  createOwnerMark,
  destroyOwnerMark,
} from "@/lib/admin/owner-traffic";

/**
 * Turns owner mode on/off for the calling browser (see the doc comment on
 * isOwnerRequest in lib/admin/owner-traffic.ts). Gated on an already-valid
 * /admin session, same as every other /api/admin/* route — this endpoint
 * itself grants no admin access, it only marks the browser as the owner's
 * for analytics purposes.
 */
async function requireAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return isAdminRequestAuthorized(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const { token, expiresAt } = await createOwnerMark();
  const cookieStore = await cookies();
  cookieStore.set(OWNER_MARK_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  return NextResponse.json({ ok: true, expiresAt });
}

export async function DELETE() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  const cookieStore = await cookies();
  await destroyOwnerMark(cookieStore.get(OWNER_MARK_COOKIE)?.value);
  cookieStore.delete(OWNER_MARK_COOKIE);
  return NextResponse.json({ ok: true });
}
