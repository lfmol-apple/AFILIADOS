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

describe("POST /api/analytics/pageview — owner notification", () => {
  it("notifies on the first pageview of a brand-new session", async () => {
    const { POST } = await load();
    const res = await POST(post(base));
    expect(res.status).toBe(200);
    expect(sendPushToOwner).toHaveBeenCalledTimes(1);
    expect(sendPushToOwner).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Novo visitante no PreçoCaindo" }),
    );
  });

  it("does not notify again for a second pageview of the same session, same day", async () => {
    const { POST } = await load();
    await POST(post(base));
    sendPushToOwner.mockClear();
    await POST(
      post({ ...base, pageType: "product", pageSlug: "outro-produto" }),
    );
    expect(sendPushToOwner).not.toHaveBeenCalled();
  });

  it("notifies again for a different session the same day", async () => {
    const { POST } = await load();
    await POST(post(base));
    sendPushToOwner.mockClear();
    await POST(post({ ...base, sessionId: "sess-2" }));
    expect(sendPushToOwner).toHaveBeenCalledTimes(1);
  });

  it("never notifies for the owner's own request (valid admin session)", async () => {
    const { token } = await createAdminSession();
    const { POST } = await load();
    const res = await POST(post(base, `${ADMIN_SESSION_COOKIE}=${token}`));
    expect(res.status).toBe(200);
    expect(sendPushToOwner).not.toHaveBeenCalled();
    expect(
      await prisma.pageView.count({ where: { sessionId: "sess-1" } }),
    ).toBe(0);
  });

  it("carries the right label/url through to the push payload", async () => {
    const { POST } = await load();
    await POST(
      post({ ...base, pageType: "product", pageSlug: "escova-secadora-xyz" }),
    );
    expect(sendPushToOwner).toHaveBeenCalledWith({
      title: "Novo visitante no PreçoCaindo",
      body: "Produto: escova-secadora-xyz",
      url: "/produto/escova-secadora-xyz",
    });
  });

  it("a push failure never breaks the pageview response", async () => {
    sendPushToOwner.mockRejectedValueOnce(new Error("push down"));
    const { POST } = await load();
    const res = await POST(post(base));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
