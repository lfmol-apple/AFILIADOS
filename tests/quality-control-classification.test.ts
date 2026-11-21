import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyVisualFidelity } from "@/lib/services/ai-creative-factory/quality-control";

/**
 * Real root cause, 2026-11-20 (owner's directive, "vamos corrigir a
 * causa raiz, não apenas aprovar manualmente"): a direct, manual visual
 * comparison of all 11 pending creatives against their real original
 * photos found 100% of rejections were FALSE — every single one
 * preserved brand, model, color and accessories; only ambientation
 * (background/lighting) or, in one case, a deliberately-required
 * human-model removal, differed. These fixtures use the REAL facts of
 * those 11 products (never invented), separated into the 3 real
 * outcomes the corrected auditor must distinguish.
 *
 * `classifyVisualFidelity` is the pure decision function, with zero
 * network calls — this proves the DECISION LOGIC is correct for every
 * real case found. It does NOT prove gpt-4o-mini will actually answer
 * this way on a real image (that needs a real, separately-authorized
 * call) — this suite can never cost anything itself.
 */
describe("classifyVisualFidelity — the 3 real outcomes (owner's correction, 2026-11-20)", () => {
  describe("legitimate ambientation change → APPROVED (never a defect)", () => {
    it("Lavadora Electrolux — both real badges (EWS1850P + POWERWASH PLUS) preserved, only background changed", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: true, classification: "ambientacao_legitima" });
    });

    it("Kit Halteres Barra/Anilhas — human model correctly REMOVED per this project's own generation rule, all real components preserved", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true, // the human model's removal is an ambientation/posing change, not a product alteration
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: true, classification: "ambientacao_legitima" });
    });

    it("Régua Extensão Elétrica — generic unbranded product, nothing to actually differ, only staging changed", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: true, classification: "ambientacao_legitima" });
    });

    it("is approved even when apenas_ambientacao_mudou is false, as long as the product itself is fully preserved", () => {
      // The flag is informational only — the real gate is the 4 factual
      // fields. A case with zero visible change at all must still approve.
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: false,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: true, classification: "ambientacao_legitima" });
    });
  });

  describe("real factual alteration of the product → REJECTED (the only real defect, hypothetical — none of the 11 real cases actually had this)", () => {
    it("rejects when the brand/model text genuinely differs between the two images", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: false,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: false,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "alteracao_factual" });
    });

    it("rejects when the real color genuinely differs", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: false,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: false,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "alteracao_factual" });
    });

    it("rejects when a real accessory/component is missing or different", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: false,
        apenas_ambientacao_mudou: false,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "alteracao_factual" });
    });

    it("rejects when it isn't even the same physical product", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: false,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: false,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "alteracao_factual" });
    });
  });

  describe("invented commercial content → ALWAYS REJECTED, regardless of everything else", () => {
    it("rejects even when the product itself is otherwise perfectly preserved", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: true, // e.g. the AI drew a fake price or a fabricated bonus item
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "conteudo_inventado" });
    });
  });

  describe("genuine ambiguity → PENDING for human review, never silently approved", () => {
    it("stays pending when the model itself flags doubt, even if the factual fields look fine", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        duvida_requer_revisao_humana: true,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });
  });

  it("does not approve everything by default — a response with all fields missing/undefined must be treated as a real alteration, never a silent pass", () => {
    const result = classifyVisualFidelity({});
    expect(result.approved).not.toBe(true);
  });
});

describe("runQualityControl — end-to-end with a mocked vision response (no real API call)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key-not-real");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("approves a legitimate-ambientation case end to end, exactly as the real corrected prompt is meant to", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                mesmo_produto_fisico: true,
                marca_modelo_preservados: true,
                cor_preservada: true,
                acessorios_preservados: true,
                apenas_ambientacao_mudou: true,
                conteudo_comercial_inventado: false,
                duvida_requer_revisao_humana: false,
                nota: "EWS1850P e POWERWASH PLUS presentes em ambas as imagens.",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 1200, completion_tokens: 80 },
      }),
    });

    const { runQualityControl } = await import("@/lib/services/ai-creative-factory/quality-control");
    const result = await runQualityControl({
      generatedImageBuffer: Buffer.alloc(2048, 1),
      expectedWidth: 1024,
      expectedHeight: 1536,
      originalPhotoBase64: Buffer.from("fake").toString("base64"),
      title: "Lavadora de Alta Pressão Electrolux 1850PSI",
    });

    expect(result.status).toBe("approved");
    expect(result.classification).toBe("ambientacao_legitima");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
