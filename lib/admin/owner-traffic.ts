import { Prisma } from "@prisma/client";
import {
  ADMIN_SESSION_COOKIE,
  isAdminAuthConfigured,
  verifyAdminSession,
} from "@/lib/admin/auth";

/**
 * The owner's own traffic must not pollute the admin reports. The database
 * deliberately stores no IP or identity (docs/PRIVACY.md), so the only
 * reliable marker is "was there a valid admin session on this request":
 *
 * - /go/* tags such a click with medium = "owner" (clicks are kept, so the
 *   owner can still verify tracking works — reports just skip them);
 * - /api/analytics/pageview does not store such a pageview at all;
 * - clicks fired from inside the admin itself carry pageType = "admin".
 *
 * Limitation, by design: clicks made BEFORE this existed, or while logged
 * out, cannot be told apart from a visitor's and stay in the numbers.
 */
export const OWNER_CLICK_MEDIUM = "owner";

function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export async function isOwnerRequest(request: Request): Promise<boolean> {
  if (!isAdminAuthConfigured()) return false;
  const token = readCookie(request.headers.get("cookie"), ADMIN_SESSION_COOKIE);
  if (!token) return false;
  try {
    return await verifyAdminSession(token);
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
