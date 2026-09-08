import { describe, expect, it, vi, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";

afterEach(async () => {
  await prisma.integrationCredential.deleteMany({ where: { provider: "MERCADO_LIVRE" } });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("buildMercadoLivreAuthorizationRequest", () => {
  it("builds a real PKCE S256 pair — the challenge is the actual SHA256(verifier), base64url, never a placeholder", async () => {
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "test-client-id");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://precocaindo.com.br");
    const { buildMercadoLivreAuthorizationRequest } = await import("@/lib/services/ml-oauth");

    const { state, codeVerifier, authorizationUrl } = buildMercadoLivreAuthorizationRequest();
    expect(state.length).toBeGreaterThan(20);
    expect(codeVerifier.length).toBeGreaterThan(20);

    const expectedChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
    const url = new URL(authorizationUrl);
    expect(url.origin + url.pathname).toBe("https://auth.mercadolivre.com.br/authorization");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://precocaindo.com.br/api/auth/mercadolivre/callback",
    );
    expect(url.searchParams.get("code_challenge")).toBe(expectedChallenge);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(state);
  });

  it("generates a different state and verifier on every call — never reused across authorization attempts", async () => {
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "test-client-id");
    const { buildMercadoLivreAuthorizationRequest } = await import("@/lib/services/ml-oauth");
    const a = buildMercadoLivreAuthorizationRequest();
    const b = buildMercadoLivreAuthorizationRequest();
    expect(a.state).not.toBe(b.state);
    expect(a.codeVerifier).not.toBe(b.codeVerifier);
  });
});

describe("completeMercadoLivreOAuth", () => {
  it("exchanges a real code for tokens and persists them into the same IntegrationCredential row ml-token-store.ts reads", async () => {
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "test-client-id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "test-client-secret");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://precocaindo.com.br");

    const fetchSpy = vi.fn(async (_url: string, init: RequestInit) => {
      const body = new URLSearchParams(init.body as string);
      expect(body.get("grant_type")).toBe("authorization_code");
      expect(body.get("code")).toBe("real-auth-code");
      expect(body.get("code_verifier")).toBe("real-code-verifier");
      expect(body.get("redirect_uri")).toBe("https://precocaindo.com.br/api/auth/mercadolivre/callback");
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 21600 }),
      };
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { completeMercadoLivreOAuth } = await import("@/lib/services/ml-oauth");
    await completeMercadoLivreOAuth({ code: "real-auth-code", codeVerifier: "real-code-verifier" });

    const row = await prisma.integrationCredential.findUnique({ where: { provider: "MERCADO_LIVRE" } });
    expect(row?.accessToken).toBe("new-access");
    expect(row?.refreshToken).toBe("new-refresh");
    expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("overwrites a previous row (upsert) rather than erroring on a second real authorization", async () => {
    await prisma.integrationCredential.create({
      data: {
        provider: "MERCADO_LIVRE",
        accessToken: "old",
        refreshToken: "old-refresh",
        expiresAt: new Date(),
      },
    });
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "second-access", refresh_token: "second-refresh", expires_in: 21600 }),
      })),
    );
    const { completeMercadoLivreOAuth } = await import("@/lib/services/ml-oauth");
    await completeMercadoLivreOAuth({ code: "x", codeVerifier: "y" });

    const rows = await prisma.integrationCredential.findMany({ where: { provider: "MERCADO_LIVRE" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.accessToken).toBe("second-access");
  });

  it("throws clearly without logging the code/tokens when Mercado Livre rejects the exchange", async () => {
    vi.stubEnv("MERCADO_LIVRE_CLIENT_ID", "id");
    vi.stubEnv("MERCADO_LIVRE_CLIENT_SECRET", "secret");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_grant" }) })),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { completeMercadoLivreOAuth } = await import("@/lib/services/ml-oauth");
    await expect(
      completeMercadoLivreOAuth({ code: "secret-code-value", codeVerifier: "secret-verifier-value" }),
    ).rejects.toThrow(/token exchange failed/i);

    const loggedText = errorSpy.mock.calls.flat().map((c) => JSON.stringify(c)).join(" ");
    expect(loggedText).not.toContain("secret-code-value");
    expect(loggedText).not.toContain("secret-verifier-value");
    errorSpy.mockRestore();

    expect(await prisma.integrationCredential.findUnique({ where: { provider: "MERCADO_LIVRE" } })).toBeNull();
  });
});

describe("getMercadoLivreRedirectUri", () => {
  it("is deterministic and always points at the exact registered DevCenter path", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://precocaindo.com.br");
    const { getMercadoLivreRedirectUri } = await import("@/lib/services/ml-oauth");
    expect(getMercadoLivreRedirectUri()).toBe("https://precocaindo.com.br/api/auth/mercadolivre/callback");
  });
});
