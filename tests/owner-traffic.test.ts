import { describe, expect, it, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { createAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/auth";
import {
  OWNER_MARK_COOKIE,
  createOwnerMark,
  destroyOwnerMark,
  getActiveOwnerMark,
  isOwnerRequest,
  verifyOwnerMark,
} from "@/lib/admin/owner-traffic";

function requestWithCookies(cookies: Record<string, string>): Request {
  const header = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return new Request("https://precocaindo.com.br/", {
    headers: header ? { cookie: header } : {},
  });
}

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Real root cause found 2026-11-25 (investigating 7 CI failures shared
 * by main, #19 and #20): this file's own `afterEach` used to call
 * `adminSession.deleteMany({ where: {} })` / `ownerTrafficMark.deleteMany({
 * where: {} })` — an UNSCOPED wipe of the ENTIRE shared table. Vitest
 * runs test files in parallel workers against the SAME database by
 * default; tests/admin-auth.test.ts and tests/pageview-owner-notify.test.ts
 * both also create real AdminSession rows. A genuine, reproduced (not
 * "CI flakiness") race: this file's cleanup could delete a row another
 * file's test had just created and not yet asserted on, or vice versa.
 * Reproduced locally against a truly fresh database with the exact CI
 * environment before this fix, confirmed fixed after it. Every test here
 * now tracks exactly the token(s) IT created and deletes only those —
 * never touches a row it didn't create.
 */
let createdSessionTokens: string[] = [];
let createdMarkTokens: string[] = [];

async function trackedAdminSession() {
  const result = await createAdminSession();
  createdSessionTokens.push(result.token);
  return result;
}

async function trackedOwnerMark() {
  const result = await createOwnerMark();
  createdMarkTokens.push(result.token);
  return result;
}

afterEach(async () => {
  if (createdSessionTokens.length > 0) {
    await prisma.adminSession.deleteMany({ where: { tokenHash: { in: createdSessionTokens.map(hash) } } });
  }
  if (createdMarkTokens.length > 0) {
    await prisma.ownerTrafficMark.deleteMany({ where: { tokenHash: { in: createdMarkTokens.map(hash) } } });
  }
  createdSessionTokens = [];
  createdMarkTokens = [];
});

describe("owner traffic mark", () => {
  it("a freshly created mark verifies and reports its own expiry", async () => {
    const { token, expiresAt } = await trackedOwnerMark();
    expect(await verifyOwnerMark(token)).toBe(true);
    const active = await getActiveOwnerMark(token);
    expect(active?.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it("an unknown token never verifies", async () => {
    expect(await verifyOwnerMark("not-a-real-token")).toBe(false);
    expect(await getActiveOwnerMark("not-a-real-token")).toBeNull();
  });

  it("only the token hash is persisted, never the raw token", async () => {
    const { token } = await trackedOwnerMark();
    // Scoped to this test's own token — asserting on the whole table's
    // row count would be wrong under parallel test files sharing the DB.
    const rows = await prisma.ownerTrafficMark.findMany({ where: { tokenHash: hash(token) } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(token);
  });

  it("an expired mark no longer verifies", async () => {
    const { token } = await trackedOwnerMark();
    await prisma.ownerTrafficMark.update({
      where: { tokenHash: hash(token) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await verifyOwnerMark(token)).toBe(false);
  });

  it("revoking destroys the mark — it can't be reused after", async () => {
    const { token } = await trackedOwnerMark();
    await destroyOwnerMark(token);
    expect(await verifyOwnerMark(token)).toBe(false);
  });

  it("lasts far longer than an admin session (~400 days, not 12h)", async () => {
    const { expiresAt } = await trackedOwnerMark();
    const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(300);
  });
});

describe("isOwnerRequest", () => {
  it("a request with neither cookie is not the owner", async () => {
    expect(await isOwnerRequest(requestWithCookies({}))).toBe(false);
  });

  it("a valid admin session alone is enough", async () => {
    const { token } = await trackedAdminSession();
    const req = requestWithCookies({ [ADMIN_SESSION_COOKIE]: token });
    expect(await isOwnerRequest(req)).toBe(true);
  });

  it("a valid owner mark alone is enough, without any admin session", async () => {
    const { token } = await trackedOwnerMark();
    const req = requestWithCookies({ [OWNER_MARK_COOKIE]: token });
    expect(await isOwnerRequest(req)).toBe(true);
  });

  it("an expired admin session falls back to a valid owner mark", async () => {
    const { token: sessionToken } = await trackedAdminSession();
    await prisma.adminSession.update({
      where: { tokenHash: hash(sessionToken) },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const { token: markToken } = await trackedOwnerMark();
    const req = requestWithCookies({
      [ADMIN_SESSION_COOKIE]: sessionToken,
      [OWNER_MARK_COOKIE]: markToken,
    });
    expect(await isOwnerRequest(req)).toBe(true);
  });

  it("garbage cookie values never throw and are simply not the owner", async () => {
    const req = requestWithCookies({
      [ADMIN_SESSION_COOKIE]: "garbage",
      [OWNER_MARK_COOKIE]: "garbage",
    });
    await expect(isOwnerRequest(req)).resolves.toBe(false);
  });
});
