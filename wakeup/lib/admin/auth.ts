import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/config/env";

/**
 * Real session-based authentication for /admin, replacing the old
 * ADMIN_ACCESS_TOKEN shared-secret-in-the-URL scheme. Deliberately uses
 * only Node's built-in `node:crypto` (scrypt for password hashing,
 * timingSafeEqual for comparison) — no new dependency, consistent with
 * how lib/services/price-alert.ts already hashes contacts with
 * node:crypto. This is a small, single-admin panel, not a user system:
 * one password, one session type, no roles.
 */

export const ADMIN_SESSION_COOKIE = "precocaindo_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15min

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// --- password hashing -------------------------------------------------

/** Run this offline (see scripts/generate-admin-password-hash.ts) — never
 * called from a request path. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, saltHex, hashHex] = parts;
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function isAdminAuthConfigured(): boolean {
  return env.ADMIN_PASSWORD_HASH.startsWith("scrypt:");
}

// --- login rate limiting ----------------------------------------------

/** ipHash, never the raw address — data minimization, same principle as
 * PriceAlert.contactHash. */
function hashIp(ip: string): string {
  return sha256Hex(ip);
}

export async function isLoginRateLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const recentFailures = await prisma.adminLoginAttempt.count({
    where: { ipHash: hashIp(ip), success: false, createdAt: { gte: since } },
  });
  return recentFailures >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  await prisma.adminLoginAttempt.create({ data: { ipHash: hashIp(ip), success } });
}

// --- sessions -----------------------------------------------------------

export async function createAdminSession(): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  // Only the hash is persisted — a database leak alone can never be
  // replayed as a live session; the raw token exists only in the
  // HttpOnly cookie.
  await prisma.adminSession.create({ data: { tokenHash: sha256Hex(token), expiresAt } });
  return { token, expiresAt };
}

export async function verifyAdminSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash: sha256Hex(token) },
  });
  if (!session) return false;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { id: session.id } }).catch(() => {});
    return false;
  }
  // Best-effort activity timestamp — never block the request on this.
  // updateMany (not update) so a session deleted concurrently by a logout
  // just matches zero rows instead of throwing "record not found".
  void prisma.adminSession
    .updateMany({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});
  return true;
}

export async function destroyAdminSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await prisma.adminSession.deleteMany({ where: { tokenHash: sha256Hex(token) } });
}

/**
 * Single policy decision for "is this /admin request authorized" — used by
 * both the login form's post-auth check and the /admin page itself, so the
 * two can never disagree.
 *
 * When no password is configured at all, /admin is open in development
 * (matches the same fail-open-in-dev / fail-closed-in-production shape
 * already used by isPublicCatalogSafeToShow()) but hard-blocked in
 * production — an unconfigured admin panel must never be silently public
 * once deployed for real.
 */
export async function isAdminRequestAuthorized(
  sessionToken: string | undefined | null,
): Promise<boolean> {
  if (!isAdminAuthConfigured()) {
    return process.env.NODE_ENV !== "production";
  }
  return verifyAdminSession(sessionToken);
}
