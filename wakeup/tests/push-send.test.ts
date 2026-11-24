import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";

const sendNotification = vi.hoisted(() => vi.fn());
const setVapidDetails = vi.hoisted(() => vi.fn());
vi.mock("web-push", () => ({
  default: { sendNotification, setVapidDetails },
}));

async function load() {
  vi.resetModules();
  return import("@/lib/push/send");
}

afterEach(async () => {
  await prisma.pushSubscription.deleteMany({ where: {} });
  vi.unstubAllEnvs();
  sendNotification.mockReset();
  setVapidDetails.mockReset();
});

describe("isPushConfigured", () => {
  it("false when the VAPID keys are not set", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "");
    const { isPushConfigured } = await load();
    expect(isPushConfigured()).toBe(false);
  });

  it("true once both keys are set", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
    const { isPushConfigured } = await load();
    expect(isPushConfigured()).toBe(true);
  });
});

describe("sendPushToOwner", () => {
  beforeEach(() => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
    vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
  });

  it("does nothing (never throws) when push isn't configured", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    const { sendPushToOwner } = await load();
    await expect(
      sendPushToOwner({ title: "t", body: "b" }),
    ).resolves.toBeUndefined();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("does nothing when there is no subscription", async () => {
    const { sendPushToOwner } = await load();
    await sendPushToOwner({ title: "t", body: "b" });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("sends to every subscribed browser with the right endpoint and keys", async () => {
    await prisma.pushSubscription.createMany({
      data: [
        { endpoint: "https://push.example/a", p256dh: "p1", auth: "a1" },
        { endpoint: "https://push.example/b", p256dh: "p2", auth: "a2" },
      ],
    });
    sendNotification.mockResolvedValue(undefined);
    const { sendPushToOwner } = await load();
    await sendPushToOwner({
      title: "Novo visitante",
      body: "Ofertas",
      url: "/ofertas",
    });

    expect(sendNotification).toHaveBeenCalledTimes(2);
    const endpoints = sendNotification.mock.calls
      .map((c) => c[0].endpoint)
      .sort();
    expect(endpoints).toEqual([
      "https://push.example/a",
      "https://push.example/b",
    ]);
    const payload = JSON.parse(sendNotification.mock.calls[0]![1]);
    expect(payload).toEqual({
      title: "Novo visitante",
      body: "Ofertas",
      url: "/ofertas",
    });
  });

  it("deletes a subscription the browser revoked (410 Gone), keeps the others", async () => {
    await prisma.pushSubscription.createMany({
      data: [
        { endpoint: "https://push.example/dead", p256dh: "p1", auth: "a1" },
        { endpoint: "https://push.example/alive", p256dh: "p2", auth: "a2" },
      ],
    });
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint.endsWith("dead")) {
        const err = new Error("gone") as Error & { statusCode: number };
        err.statusCode = 410;
        throw err;
      }
    });
    const { sendPushToOwner } = await load();
    await sendPushToOwner({ title: "t", body: "b" });

    const remaining = await prisma.pushSubscription.findMany();
    expect(remaining.map((s) => s.endpoint)).toEqual([
      "https://push.example/alive",
    ]);
  });

  it("a transient failure (not 404/410) never throws and keeps the subscription", async () => {
    await prisma.pushSubscription.create({
      data: {
        endpoint: "https://push.example/flaky",
        p256dh: "p1",
        auth: "a1",
      },
    });
    sendNotification.mockRejectedValue(new Error("network blip"));
    const { sendPushToOwner } = await load();
    await expect(
      sendPushToOwner({ title: "t", body: "b" }),
    ).resolves.toBeUndefined();
    expect(await prisma.pushSubscription.count()).toBe(1);
  });
});
