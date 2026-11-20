import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Real incident, 2026-11-20: an "isolated" pipeline test, pointed at an
 * empty test database, silently made US$1.45 of real OpenAI calls —
 * `checkCreativeBudget()` read $0 spent from that empty database and
 * allowed every call, even though the real, shared OpenAI key was the
 * one actually billed. These tests prove the real fix: a mode gate
 * inside `generateCreativeBase()` itself (the one place that calls the
 * paid endpoint) blocks every call by default, with ZERO real network
 * requests — `fetch` is mocked and asserted never called, so this suite
 * can never itself cost anything, matching the owner's explicit
 * instruction not to spend to test the block.
 */
describe("generateCreativeBase — real-money gate (owner's incident correction, 2026-11-20)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const BASE_INPUT = {
    productPhoto: Buffer.from("fake-photo"),
    productPhotoContentType: "image/jpeg",
    prompt: "irrelevant for these tests",
  };

  it("blocks every paid call when VITRINE_CREATIVE_MODE is unset (the real default)", async () => {
    delete process.env.VITRINE_CREATIVE_MODE;
    const { generateCreativeBase, CreativeGenerationBlockedError } = await import(
      "@/lib/services/ai-creative-factory/openai-image-client"
    );
    await expect(generateCreativeBase(BASE_INPUT)).rejects.toThrow(CreativeGenerationBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks every paid call when VITRINE_CREATIVE_MODE=teste is explicit", async () => {
    vi.stubEnv("VITRINE_CREATIVE_MODE", "teste");
    const { generateCreativeBase, CreativeGenerationBlockedError } = await import(
      "@/lib/services/ai-creative-factory/openai-image-client"
    );
    await expect(generateCreativeBase(BASE_INPUT)).rejects.toThrow(CreativeGenerationBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks piloto_autorizado mode when no explicit call cap was set (defaults to 0, not open)", async () => {
    vi.stubEnv("VITRINE_CREATIVE_MODE", "piloto_autorizado");
    vi.stubEnv("VITRINE_CREATIVE_PILOT_MAX_CALLS", "");
    const { generateCreativeBase, CreativeGenerationBlockedError } = await import(
      "@/lib/services/ai-creative-factory/openai-image-client"
    );
    await expect(generateCreativeBase(BASE_INPUT)).rejects.toThrow(CreativeGenerationBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("piloto_autorizado with an explicit cap allows exactly that many calls, then blocks — never exceeding it even if the caller keeps calling", async () => {
    vi.stubEnv("VITRINE_CREATIVE_MODE", "piloto_autorizado");
    vi.stubEnv("VITRINE_CREATIVE_PILOT_MAX_CALLS", "2");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ b64_json: Buffer.from("fake-image").toString("base64") }] }),
    });
    const { generateCreativeBase, CreativeGenerationBlockedError } = await import(
      "@/lib/services/ai-creative-factory/openai-image-client"
    );

    await generateCreativeBase(BASE_INPUT);
    await generateCreativeBase(BASE_INPUT);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await expect(generateCreativeBase(BASE_INPUT)).rejects.toThrow(CreativeGenerationBlockedError);
    expect(fetchMock).toHaveBeenCalledTimes(2); // the 3rd call never reached fetch
  });

  it("producao mode re-checks the real DB budget itself, even though callers already check it (defense-in-depth)", async () => {
    vi.stubEnv("VITRINE_CREATIVE_MODE", "producao");
    vi.doMock("@/lib/services/ai-creative-factory/budget", () => ({
      checkCreativeBudget: vi.fn().mockResolvedValue({
        allowed: false,
        reason: "Limite diário já atingido (teste).",
        spentTodayUsd: 999,
        spentThisMonthUsd: 999,
        dailyLimitUsd: 2,
        monthlyLimitUsd: 20,
      }),
    }));
    const { generateCreativeBase, CreativeGenerationBlockedError } = await import(
      "@/lib/services/ai-creative-factory/openai-image-client"
    );
    await expect(generateCreativeBase(BASE_INPUT)).rejects.toThrow(CreativeGenerationBlockedError);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.doUnmock("@/lib/services/ai-creative-factory/budget");
  });
});
