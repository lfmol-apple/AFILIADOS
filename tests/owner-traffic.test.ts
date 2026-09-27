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

afterEach(async () => {
  await prisma.adminSession.deleteMany({ where: {} });
  await prisma.ownerTrafficMark.deleteMany({ where: {} });
});

describe("owner traffic mark", () => {
  it("a freshly created mark verifies and reports its own expiry", async () => {
    const { token, expiresAt } = await createOwnerMark();
    expect(await verifyOwnerMark(token)).toBe(true);
    const active = await getActiveOwnerMark(token);
    expect(active?.expiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it("an unknown token never verifies", async () => {
    expect(await verifyOwnerMark("not-a-real-token")).toBe(false);
    expect(await getActiveOwnerMark("not-a-real-token")).toBeNull();
  });

  it("only the token hash is persisted, never the raw token", async () => {
    const { token } = await createOwnerMark();
    const rows = await prisma.ownerTrafficMark.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.tokenHash).not.toBe(token);
  });

  it("an expired mark no longer verifies", async () => {
    const { token } = await createOwnerMark();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.ownerTrafficMark.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await verifyOwnerMark(token)).toBe(false);
  });

  it("revoking destroys the mark — it can't be reused after", async () => {
    const { token } = await createOwnerMark();
    await destroyOwnerMark(token);
    expect(await verifyOwnerMark(token)).toBe(false);
  });

  it("lasts far longer than an admin session (~400 days, not 12h)", async () => {
    const { expiresAt } = await createOwnerMark();
    const days = (expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(300);
  });
});

describe("isOwnerRequest", () => {
  it("a request with neither cookie is not the owner", async () => {
    expect(await isOwnerRequest(requestWithCookies({}))).toBe(false);
  });

  it("a valid admin session alone is enough", async () => {
    const { token } = await createAdminSession();
    const req = requestWithCookies({ [ADMIN_SESSION_COOKIE]: token });
    expect(await isOwnerRequest(req)).toBe(true);
  });

  it("a valid owner mark alone is enough, without any admin session", async () => {
    const { token } = await createOwnerMark();
    const req = requestWithCookies({ [OWNER_MARK_COOKIE]: token });
    expect(await isOwnerRequest(req)).toBe(true);
  });

  it("an expired admin session falls back to a valid owner mark", async () => {
    const { token: sessionToken } = await createAdminSession();
    const sessionHash = createHash("sha256").update(sessionToken).digest("hex");
    await prisma.adminSession.update({
      where: { tokenHash: sessionHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const { token: markToken } = await createOwnerMark();
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
