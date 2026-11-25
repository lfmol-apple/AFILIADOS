import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { createAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/auth";

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const sendPushToOwner = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/push/send", () => ({ sendPushToOwner }));

async function load() {
  vi.resetModules();
  return import("@/app/api/analytics/pageview/route");
}

function post(body: Record<string, unknown>, cookie?: string) {
  return new Request("http://x/api/analytics/pageview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const base = { pageType: "ofertas", pageSlug: "ofertas", sessionId: "sess-1" };

/**
 * Real root cause found 2026-11-25 (investigating 7 CI failures shared
 * by main, #19 and #20): AdminSession is also touched by
 * tests/owner-traffic.test.ts and tests/admin-auth.test.ts — vitest runs
 * test files in parallel workers against the same database, so the old
 * `adminSession.deleteMany({ where: {} })` here could delete a session
 * another file's test had just created and not yet asserted on.
 */
let createdSessionTokens: string[] = [];

afterEach(async () => {
  await prisma.pageView.deleteMany({
    where: { sessionId: { startsWith: "sess-" } },
  });
  if (createdSessionTokens.length > 0) {
    await prisma.adminSession.deleteMany({ where: { tokenHash: { in: createdSessionTokens.map(hash) } } });
  }
  createdSessionTokens = [];
  sendPushToOwner.mockClear();
});

describe("POST /api/analytics/pageview — never notifies the owner", () => {
  it.each([
    ["home", "home"],
    ["ofertas", "ofertas"],
    ["product", "escova-secadora-xyz"],
  ])("stores the %s pageview but sends no push", async (pageType, pageSlug) => {
    const { POST } = await load();
    const res = await POST(post({ ...base, pageType, pageSlug }));
    expect(res.status).toBe(200);
    expect(sendPushToOwner).not.toHaveBeenCalled();
    expect(
      await prisma.pageView.count({ where: { sessionId: "sess-1" } }),
    ).toBe(1);
  });

  it("the owner's own request is still not stored", async () => {
    const { token } = await createAdminSession();
    createdSessionTokens.push(token);
    const { POST } = await load();
    const res = await POST(post(base, `${ADMIN_SESSION_COOKIE}=${token}`));
    expect(res.status).toBe(200);
    expect(sendPushToOwner).not.toHaveBeenCalled();
    expect(
      await prisma.pageView.count({ where: { sessionId: "sess-1" } }),
    ).toBe(0);
  });
});
