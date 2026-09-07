import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";

afterEach(async () => {
  await prisma.integrationCredential.deleteMany({ where: { provider: "MERCADO_LIVRE" } });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getValidMercadoLivreAccessToken", () => {
  it("bootstraps a row from env when none exists, and — since a bootstrapped token's real remaining lifetime is unknown — immediately refreshes rather than guessing it's still valid", async () => {
    vi.stubEnv("MERCADO_LIVRE_ACCESS_TOKEN", "stale-env-token");
    vi.stubEnv("MERCADO_LIVRE_REFRESH_TOKEN", "env-refresh-token");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "client-id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "client-secret");

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "fresh-access-token",
        refresh_token: "fresh-refresh-token",
        expires_in: 21600,
      }),
    }));
    vi.stubGlobal("fetch", fetchSpy);

    const { getValidMercadoLivreAccessToken } = await import("@/lib/services/ml-token-store");
    const token = await getValidMercadoLivreAccessToken();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.mercadolibre.com/oauth/token",
      expect.objectContaining({ method: "POST" }),
    );
    expect(token).toBe("fresh-access-token");

    const row = await prisma.integrationCredential.findUnique({ where: { provider: "MERCADO_LIVRE" } });
    expect(row?.accessToken).toBe("fresh-access-token");
    expect(row?.refreshToken).toBe("fresh-refresh-token");
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("returns the cached token without calling the network when it's still valid well beyond the refresh margin", async () => {
    await prisma.integrationCredential.create({
      data: {
        provider: "MERCADO_LIVRE",
        accessToken: "still-valid-token",
        refreshToken: "still-valid-refresh",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h out
      },
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { getValidMercadoLivreAccessToken } = await import("@/lib/services/ml-token-store");
    const token = await getValidMercadoLivreAccessToken();

    expect(token).toBe("still-valid-token");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refreshes when inside the margin, even if not yet fully expired", async () => {
    await prisma.integrationCredential.create({
      data: {
        provider: "MERCADO_LIVRE",
        accessToken: "about-to-expire",
        refreshToken: "refresh-me",
        expiresAt: new Date(Date.now() + 60 * 1000), // 1 minute out — inside the 10min margin
      },
    });
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "client-id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "renewed", refresh_token: "renewed-refresh", expires_in: 21600 }),
      })),
    );

    const { getValidMercadoLivreAccessToken } = await import("@/lib/services/ml-token-store");
    expect(await getValidMercadoLivreAccessToken()).toBe("renewed");
  });

  it("dedupes concurrent refreshes within the same process — only one network call for simultaneous callers", async () => {
    await prisma.integrationCredential.create({
      data: {
        provider: "MERCADO_LIVRE",
        accessToken: "expiring",
        refreshToken: "refresh-me",
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "client-id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "client-secret");
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "single-refresh", refresh_token: "single-refresh-rt", expires_in: 21600 }),
        };
      }),
    );

    const { getValidMercadoLivreAccessToken } = await import("@/lib/services/ml-token-store");
    const [a, b, c] = await Promise.all([
      getValidMercadoLivreAccessToken(),
      getValidMercadoLivreAccessToken(),
      getValidMercadoLivreAccessToken(),
    ]);

    expect(calls).toBe(1);
    expect([a, b, c]).toEqual(["single-refresh", "single-refresh", "single-refresh"]);
  });

  it("on a lost race (another process already refreshed), re-reads the current row instead of erroring or double-spending the rotated refresh_token", async () => {
    await prisma.integrationCredential.create({
      data: {
        provider: "MERCADO_LIVRE",
        accessToken: "expiring",
        refreshToken: "refresh-me",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "client-id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        // Simulates another process winning the race: the row's
        // accessToken changes out from under this refresh between its
        // read and its update.
        await prisma.integrationCredential.update({
          where: { provider: "MERCADO_LIVRE" },
          data: { accessToken: "winner-token", refreshToken: "winner-refresh", expiresAt: new Date(Date.now() + 21600000) },
        });
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: "loser-token", refresh_token: "loser-refresh", expires_in: 21600 }),
        };
      }),
    );

    const { getValidMercadoLivreAccessToken } = await import("@/lib/services/ml-token-store");
    const token = await getValidMercadoLivreAccessToken();
    expect(token).toBe("winner-token"); // never the lost race's own result
  });

  it("throws a clear error, without logging token values, when the refresh_token is rejected", async () => {
    await prisma.integrationCredential.create({
      data: {
        provider: "MERCADO_LIVRE",
        accessToken: "expiring",
        refreshToken: "invalid-refresh",
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "client-id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) })),
    );

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { getValidMercadoLivreAccessToken } = await import("@/lib/services/ml-token-store");
    await expect(getValidMercadoLivreAccessToken()).rejects.toThrow(/refresh failed/i);

    const loggedText = errorSpy.mock.calls.flat().map((c) => JSON.stringify(c)).join(" ");
    expect(loggedText).not.toContain("invalid-refresh");
    errorSpy.mockRestore();
  });
});
