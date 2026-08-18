import { describe, expect, it } from "vitest";
import { runHealthCheck } from "@/lib/observability/health";

describe("runHealthCheck", () => {
  it("reports healthy against the real (reachable) test database", async () => {
    const result = await runHealthCheck();
    expect(result.checks.database.status).toBe("healthy");
    expect(result.status).not.toBe("unhealthy");
  });

  it("includes a migrations check that doesn't error out", async () => {
    const result = await runHealthCheck();
    expect(["healthy", "degraded", "unhealthy"]).toContain(result.checks.migrations.status);
    expect(typeof result.checks.migrations.detail).toBe("string");
  });

  it("never includes a secret-shaped field in the response", async () => {
    const result = await runHealthCheck();
    const serialized = JSON.stringify(result);
    expect(serialized.toLowerCase()).not.toContain("password");
    expect(serialized.toLowerCase()).not.toContain("secret");
    expect(serialized).not.toContain("postgresql://");
  });

  it("reports the current provider and content generation mode", async () => {
    const result = await runHealthCheck();
    expect(["mock", "live"]).toContain(result.providerMode);
    expect(typeof result.contentGenerationMode).toBe("string");
  });

  it("includes an ISO timestamp", async () => {
    const result = await runHealthCheck();
    expect(() => new Date(result.checkedAt).toISOString()).not.toThrow();
  });
});
