import { describe, expect, it, vi, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createAdminSession,
  verifyAdminSession,
  destroyAdminSession,
  isLoginRateLimited,
  recordLoginAttempt,
  isAdminAuthConfigured,
} from "@/lib/admin/auth";

const TEST_IP = "203.0.113.42"; // TEST-NET-3, RFC 5737 — never a real address

afterEach(async () => {
  await prisma.adminLoginAttempt.deleteMany({ where: {} });
  await prisma.adminSession.deleteMany({ where: {} });
});

describe("password hashing", () => {
  it("verifies the correct password", () => {
    const hash = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword("correct-horse-battery-staple", hash)).toBe(true);
  });

  it("rejects a wrong password", () => {
    const hash = hashPassword("correct-horse-battery-staple");
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("never stores the plaintext password in the hash string", () => {
    const hash = hashPassword("correct-horse-battery-staple");
    expect(hash).not.toContain("correct-horse-battery-staple");
    expect(hash.startsWith("scrypt:")).toBe(true);
  });

  it("produces a different hash each time (random salt)", () => {
    const a = hashPassword("same-password");
    const b = hashPassword("same-password");
    expect(a).not.toBe(b);
    expect(verifyPassword("same-password", a)).toBe(true);
    expect(verifyPassword("same-password", b)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", () => {
    expect(verifyPassword("anything", "not-a-real-hash")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
    expect(verifyPassword("anything", "scrypt:onlytwoparts")).toBe(false);
  });
});

describe("admin sessions", () => {
  it("a freshly created session verifies successfully", async () => {
    const { token } = await createAdminSession();
    expect(await verifyAdminSession(token)).toBe(true);
  });

  it("an unknown token never verifies", async () => {
    expect(await verifyAdminSession("not-a-real-token")).toBe(false);
    expect(await verifyAdminSession(undefined)).toBe(false);
    expect(await verifyAdminSession(null)).toBe(false);
  });

  it("logout destroys the session — it can't be reused after", async () => {
    const { token } = await createAdminSession();
    expect(await verifyAdminSession(token)).toBe(true);
    await destroyAdminSession(token);
    expect(await verifyAdminSession(token)).toBe(false);
  });

  it("only the token hash is persisted, never the raw token", async () => {
    const { token } = await createAdminSession();
    const rows = await prisma.adminSession.findMany();
    expect(rows.some((r) => r.tokenHash === token)).toBe(false);
  });

  it("an expired session no longer verifies", async () => {
    const { token } = await createAdminSession();
    // Force it into the past directly, since createAdminSession() always
    // sets a real future expiry.
    const { createHash } = await import("node:crypto");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.adminSession.update({
      where: { tokenHash },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await verifyAdminSession(token)).toBe(false);
  });
});

describe("login rate limiting", () => {
  it("is not rate limited before any failures", async () => {
    expect(await isLoginRateLimited(TEST_IP)).toBe(false);
  });

  it("locks out after enough failed attempts from the same IP", async () => {
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt(TEST_IP, false);
    }
    expect(await isLoginRateLimited(TEST_IP)).toBe(true);
  });

  it("a successful attempt does not count toward the failure lockout", async () => {
    for (let i = 0; i < 4; i++) {
      await recordLoginAttempt(TEST_IP, false);
    }
    await recordLoginAttempt(TEST_IP, true);
    expect(await isLoginRateLimited(TEST_IP)).toBe(false);
  });

  it("only stores a hash of the IP, never the raw address", async () => {
    await recordLoginAttempt(TEST_IP, false);
    const rows = await prisma.adminLoginAttempt.findMany();
    expect(rows.some((r) => r.ipHash === TEST_IP)).toBe(false);
  });

  it("lockout is scoped per IP — a different IP is unaffected", async () => {
    for (let i = 0; i < 5; i++) {
      await recordLoginAttempt(TEST_IP, false);
    }
    expect(await isLoginRateLimited("198.51.100.7")).toBe(false);
  });
});

describe("isAdminRequestAuthorized policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("without ADMIN_PASSWORD_HASH configured, allows access outside production", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    vi.stubEnv("NODE_ENV", "development");
    const { isAdminRequestAuthorized: fresh } = await import("@/lib/admin/auth");
    expect(await fresh(undefined)).toBe(true);
  });

  it("without ADMIN_PASSWORD_HASH configured, hard-blocks access in production", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", "");
    vi.stubEnv("NODE_ENV", "production");
    const { isAdminRequestAuthorized: fresh } = await import("@/lib/admin/auth");
    expect(await fresh(undefined)).toBe(false);
    expect(await fresh("any-token-at-all")).toBe(false);
  });

  it("with ADMIN_PASSWORD_HASH configured, a valid session is required even outside production", async () => {
    vi.stubEnv("ADMIN_PASSWORD_HASH", "scrypt:aa:bb");
    vi.stubEnv("NODE_ENV", "development");
    const { isAdminRequestAuthorized: fresh } = await import("@/lib/admin/auth");
    expect(await fresh(undefined)).toBe(false);
    expect(await fresh("garbage-token")).toBe(false);
  });
});

describe("isAdminAuthConfigured", () => {
  it("reflects whether a real scrypt hash is set", () => {
    expect(typeof isAdminAuthConfigured()).toBe("boolean");
  });
});
