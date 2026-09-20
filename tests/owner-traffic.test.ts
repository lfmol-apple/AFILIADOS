import { beforeEach, describe, expect, it, vi } from "vitest";

const verifyAdminSession = vi.fn();
let authConfigured = true;

vi.mock("@/lib/admin/auth", () => ({
  ADMIN_SESSION_COOKIE: "precocaindo_admin_session",
  isAdminAuthConfigured: () => authConfigured,
  verifyAdminSession: (token: string) => verifyAdminSession(token),
}));

import {
  OWNER_CLICK_MEDIUM,
  REAL_VISITOR_CLICKS,
  REAL_VISITOR_CLICKS_SQL,
  isOwnerRequest,
  realClicks,
} from "@/lib/admin/owner-traffic";

function request(cookie?: string): Request {
  return new Request("http://x/go/shopee/1", {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  verifyAdminSession.mockReset();
  authConfigured = true;
});

describe("isOwnerRequest", () => {
  it("is false without a cookie and never hits the session lookup", async () => {
    expect(await isOwnerRequest(request())).toBe(false);
    expect(verifyAdminSession).not.toHaveBeenCalled();
  });

  it("is true only when the admin session cookie verifies", async () => {
    verifyAdminSession.mockResolvedValueOnce(true);
    expect(
      await isOwnerRequest(
        request("a=1; precocaindo_admin_session=tok%20en; b=2"),
      ),
    ).toBe(true);
    expect(verifyAdminSession).toHaveBeenCalledWith("tok en");

    verifyAdminSession.mockResolvedValueOnce(false);
    expect(
      await isOwnerRequest(request("precocaindo_admin_session=stale")),
    ).toBe(false);
  });

  it("ignores unrelated cookies", async () => {
    expect(await isOwnerRequest(request("other=1"))).toBe(false);
    expect(verifyAdminSession).not.toHaveBeenCalled();
  });

  it("is false when admin auth is not configured (dev without a password must not tag everyone as owner)", async () => {
    authConfigured = false;
    expect(await isOwnerRequest(request("precocaindo_admin_session=tok"))).toBe(
      false,
    );
    expect(verifyAdminSession).not.toHaveBeenCalled();
  });

  it("fails open to 'visitor' if the session lookup throws — a click is never lost or blocked", async () => {
    verifyAdminSession.mockRejectedValueOnce(new Error("db down"));
    expect(await isOwnerRequest(request("precocaindo_admin_session=tok"))).toBe(
      false,
    );
  });
});

describe("real-visitor click filter", () => {
  it("excludes admin-page clicks and owner-tagged clicks, keeping NULL medium", () => {
    expect(REAL_VISITOR_CLICKS).toEqual({
      pageType: { not: "admin" },
      OR: [{ medium: null }, { medium: { not: OWNER_CLICK_MEDIUM } }],
    });
  });

  it("wraps any existing where instead of overwriting it", () => {
    const where = realClicks({
      provider: "AMAZON",
      OR: [{ source: "a" }, { source: "b" }],
    });
    expect(where).toEqual({
      AND: [
        { provider: "AMAZON", OR: [{ source: "a" }, { source: "b" }] },
        REAL_VISITOR_CLICKS,
      ],
    });
    expect(realClicks()).toEqual({ AND: [{}, REAL_VISITOR_CLICKS] });
  });

  it("uses a NULL-safe comparison in raw SQL", () => {
    expect(REAL_VISITOR_CLICKS_SQL.sql).toContain(`IS DISTINCT FROM`);
    expect(REAL_VISITOR_CLICKS_SQL.sql).toContain(`<> 'admin'`);
    expect(REAL_VISITOR_CLICKS_SQL.values).toEqual([OWNER_CLICK_MEDIUM]);
  });
});
