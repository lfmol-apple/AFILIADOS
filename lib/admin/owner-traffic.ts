import { randomBytes, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthConfigured,
  verifyAdminSession,
} from "@/lib/admin/auth";

/**
 * The owner's own traffic must not pollute the admin reports. The database
 * deliberately stores no IP or identity (docs/PRIVACY.md), so a request is
 * "the owner" when EITHER holds:
 *
 * - there is a valid /admin session (12h, ADMIN_SESSION_COOKIE) — browsing
 *   while logged into the panel; or
 * - there is a valid, separately opt-in "owner mode" mark (OWNER_MARK_COOKIE,
 *   up to 400 days — the longest a cookie is allowed to live). This is for
 *   ordinary browsing, hours or days after the admin session itself expired.
 *   It is created only from an already-authenticated /admin request (see
 *   app/api/admin/owner-mark/route.ts) and grants no admin access of its
 *   own — a leaked mark lets someone hide from the reports, nothing else.
 *
 * Either way:
 * - /go/* tags such a click with medium = "owner" (clicks are kept, so the
 *   owner can still verify tracking works — reports just skip them);
 * - /api/analytics/pageview does not store such a pageview at all;
 * - clicks fired from inside the admin itself carry pageType = "admin".
 *
 * Limitation, by design: clicks made before either marker existed, or from a
 * browser/device that never turned owner mode on, cannot be told apart from
 * a visitor's and stay in the numbers.
 */
export const OWNER_CLICK_MEDIUM = "owner";

export const OWNER_MARK_COOKIE = "precocaindo_owner_mark";
const OWNER_MARK_TTL_MS = 400 * 24 * 60 * 60 * 1000; // 400 days — the cap browsers allow

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

/** Only the hash is persisted — same principle as AdminSession: a database
 * leak alone can never be replayed as a live mark. */
export async function createOwnerMark(): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + OWNER_MARK_TTL_MS);
  await prisma.ownerTrafficMark.create({
    data: { tokenHash: sha256Hex(token), expiresAt },
  });
  return { token, expiresAt };
}

/** The mark's own row (its expiry, for display), or null if there is none
 * or it expired. Bumps lastSeenAt as a side effect, same as an admin
 * session — best-effort, never blocks the caller on it. */
export async function getActiveOwnerMark(
  token: string | undefined | null,
): Promise<{ expiresAt: Date } | null> {
  if (!token) return null;
  const mark = await prisma.ownerTrafficMark.findUnique({
    where: { tokenHash: sha256Hex(token) },
  });
  if (!mark) return null;
  if (mark.expiresAt.getTime() < Date.now()) {
    await prisma.ownerTrafficMark
      .delete({ where: { id: mark.id } })
      .catch(() => {});
    return null;
  }
  void prisma.ownerTrafficMark
    .updateMany({ where: { id: mark.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
  return { expiresAt: mark.expiresAt };
}

export async function verifyOwnerMark(
  token: string | undefined | null,
): Promise<boolean> {
  return (await getActiveOwnerMark(token)) !== null;
}

export async function destroyOwnerMark(
  token: string | undefined | null,
): Promise<void> {
  if (!token) return;
  await prisma.ownerTrafficMark.deleteMany({
    where: { tokenHash: sha256Hex(token) },
  });
}

export async function isOwnerRequest(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie");
  if (isAdminAuthConfigured()) {
    const sessionToken = readCookie(cookieHeader, ADMIN_SESSION_COOKIE);
    if (sessionToken) {
      try {
        if (await verifyAdminSession(sessionToken)) return true;
      } catch {
        // fall through to the owner-mark check
      }
    }
  }
  const markToken = readCookie(cookieHeader, OWNER_MARK_COOKIE);
  try {
    return await verifyOwnerMark(markToken);
  } catch {
    return false;
  }
}

/** Prisma filter: real visitors only. `not` alone would drop NULL rows in
 * SQL, so NULL medium is matched explicitly. */
export const REAL_VISITOR_CLICKS: Prisma.AffiliateClickWhereInput = {
  pageType: { not: "admin" },
  OR: [{ medium: null }, { medium: { not: OWNER_CLICK_MEDIUM } }],
};

/** Adds the real-visitor filter to any AffiliateClick `where`. */
export function realClicks(
  where: Prisma.AffiliateClickWhereInput = {},
): Prisma.AffiliateClickWhereInput {
  return { AND: [where, REAL_VISITOR_CLICKS] };
}

/** Same rule for raw SQL, for queries that alias "AffiliateClick" as `ac`. */
export const REAL_VISITOR_CLICKS_SQL = Prisma.sql`ac."pageType" <> 'admin' AND ac."medium" IS DISTINCT FROM ${OWNER_CLICK_MEDIUM}`;
