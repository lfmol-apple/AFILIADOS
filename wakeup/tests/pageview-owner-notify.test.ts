import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { createAdminSession, ADMIN_SESSION_COOKIE } from "@/lib/admin/auth";

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

afterEach(async () => {
  await prisma.pageView.deleteMany({
    where: { sessionId: { startsWith: "sess-" } },
  });
  await prisma.adminSession.deleteMany({ where: {} });
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
    const { POST } = await load();
    const res = await POST(post(base, `${ADMIN_SESSION_COOKIE}=${token}`));
    expect(res.status).toBe(200);
    expect(sendPushToOwner).not.toHaveBeenCalled();
    expect(
      await prisma.pageView.count({ where: { sessionId: "sess-1" } }),
    ).toBe(0);
  });
});
