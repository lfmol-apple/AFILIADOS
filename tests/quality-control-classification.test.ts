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

  describe("invented commercial content → REJECTED only with cited, specific evidence", () => {
    it("rejects when the flag is true AND a specific invented item is cited", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: "A segunda imagem mostra um e-book promocional com capa própria que não existe em nenhum lugar da foto original.",
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "conteudo_inventado" });
    });

    it("never rejects on the flag alone — missing evidence becomes doubt, not a confident rejection", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: null,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });

    it("also treats an empty/blank evidence string as no evidence", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: "   ",
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });
  });

  describe("os 4 casos reais contestados da reauditoria de 2026-11-20 — corrigidos pela evidência obrigatória", () => {
    // Real notes from the 2026-11-20 revalidation (docs/incidents/ — not
    // committed here) all set conteudo_comercial_inventado=true on purely
    // speculative language ("pode indicar", "pode conter") or, in the
    // Kit Halteres case, while the note itself said nothing was wrong —
    // none of the 4 ever cited a real, specific invented item. Under the
    // corrected schema those calls would never have populated
    // evidencia_conteudo_inventado — these fixtures reproduce exactly
    // that (flag true, no real evidence) and prove the outcome is now
    // "duvida" (pending human review), never the false "reprovado" these
    // 4 actually received, and never a silent approval either.
    it("Electrolux 1850PSI — modelo real mais nítido na imagem gerada não é evidência de invenção", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: null, // a nota real só especulava ("pode indicar"), nunca citou algo concreto
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });

    it("Kit Halteres Barra E Anilhas — nota real já dizia 'não foi encontrado texto comercial inventado'", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true, // remoção do modelo humano, regra já coberta acima
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: null,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });

    it("Régua Extensão Elétrica — especificações reais visíveis na foto original não são conteúdo inventado", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: null, // nota real: "pode conter texto adicional... como no caso das especificações visíveis NA PRIMEIRA imagem" — isso descreve a foto original, não a gerada
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });

    it("Kit 10 Potes Herméticos Starhouse — remoção de selo promocional de terceiro não é conteúdo inventado", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true, // nota real: única diferença foi "remoção dos selos promocionais e mudança no cenário"
        conteudo_comercial_inventado: true,
        evidencia_conteudo_inventado: null,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });
  });

  describe("elemento cortado na borda (imagem FINAL pós-corte) → REJECTED only with cited, specific evidence", () => {
    // Owner's directive, 2026-11-24 ("a aprovação definitiva deve
    // considerar a imagem FINAL... ausência de textos cortados"): real
    // bug this closes — a creative was approved against the raw
    // 1024x1536 AI output, then jobs/vitrine-creative-factory.ts's own
    // real object-fit: cover crop clipped the title/banner AFTER
    // approval (confirmed live the same day, by replaying the real crop
    // on a real test generation). The caller now passes the FINAL
    // composited image instead (see jobs/vitrine-creative-factory.ts),
    // and this is the new decision rule the vision check's answer feeds.
    it("rejects when a specific cut element is cited", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        elemento_cortado_na_borda: true,
        evidencia_elemento_cortado: "A última linha do botão 'Compre agora no Mercado Livre' está cortada pela borda inferior da imagem.",
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: false, classification: "recorte_defeituoso" });
    });

    it("never rejects on the flag alone — missing evidence becomes doubt, not a confident rejection", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        elemento_cortado_na_borda: true,
        evidencia_elemento_cortado: null,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: null, classification: "duvida" });
    });

    it("is checked independently of conteudo_comercial_inventado — a cut element still rejects even when nothing was invented", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        elemento_cortado_na_borda: true,
        evidencia_elemento_cortado: "O título 'LAVADORA DE ALTA PRESSÃO' está com a primeira linha cortada pela borda superior.",
        duvida_requer_revisao_humana: false,
      });
      expect(result.approved).toBe(false);
      expect(result.classification).toBe("recorte_defeituoso");
    });

    it("does not reject when nothing is cut, even with every other field at its approving value", () => {
      const result = classifyVisualFidelity({
        mesmo_produto_fisico: true,
        marca_modelo_preservados: true,
        cor_preservada: true,
        acessorios_preservados: true,
        apenas_ambientacao_mudou: true,
        conteudo_comercial_inventado: false,
        elemento_cortado_na_borda: false,
        duvida_requer_revisao_humana: false,
      });
      expect(result).toEqual({ approved: true, classification: "ambientacao_legitima" });
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

  it("asks the vision check about cut elements only when expectedOverlay is passed (ad_overlay), never for catalog_clean", async () => {
    // Owner's directive, 2026-11-24: proves the new framing questions
    // (título/benefícios/preço/faixa integralmente visíveis) actually
    // reach the real outgoing request body when this is an ad_overlay
    // check (expectedOverlay present) — and are absent for catalog_clean
    // (no expectedOverlay), which has no title/badges/bar to check.
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ mesmo_produto_fisico: true, marca_modelo_preservados: true, cor_preservada: true, acessorios_preservados: true, apenas_ambientacao_mudou: true, conteudo_comercial_inventado: false, elemento_cortado_na_borda: false, duvida_requer_revisao_humana: false, nota: "ok" }) } }],
        usage: { prompt_tokens: 1200, completion_tokens: 80 },
      }),
    });

    const { runQualityControl } = await import("@/lib/services/ai-creative-factory/quality-control");
    await runQualityControl({
      generatedImageBuffer: Buffer.alloc(2048, 1),
      expectedWidth: 1080,
      expectedHeight: 1350,
      originalPhotoBase64: Buffer.from("fake").toString("base64"),
      title: "Pistola Tssaper TP550",
      expectedOverlay: { currentPriceBrl: 228.9, referencePriceBrl: 376.7, benefits: ["550W DE POTÊNCIA"] },
    });

    const sentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const sentText = sentBody.messages[0].content[0].text as string;
    expect(sentText).toContain("elemento_cortado_na_borda");
    expect(sentText).toMatch(/faixa do Mercado Livre.*inteiramente vis[íi]vel/i);
    expect(sentText).toMatch(/t[íi]tulo do produto est[áa] inteiramente vis[íi]vel/i);

    fetchMock.mockClear();
    await runQualityControl({
      generatedImageBuffer: Buffer.alloc(2048, 1),
      expectedWidth: 1080,
      expectedHeight: 1350,
      originalPhotoBase64: Buffer.from("fake").toString("base64"),
      title: "Pistola Tssaper TP550",
      // no expectedOverlay — a catalog_clean check, nothing to frame-check
    });
    const cleanSentBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const cleanSentText = cleanSentBody.messages[0].content[0].text as string;
    // The generic "is anything cut" question still applies (catalog_clean
    // goes through the same real crop and could clip the product itself),
    // but the detailed title/benefit/price-badge/bar checklist only makes
    // sense when those elements were actually requested.
    expect(cleanSentText).not.toMatch(/faixa do Mercado Livre.*inteiramente vis[íi]vel/i);
    expect(cleanSentText).not.toMatch(/t[íi]tulo do produto est[áa] inteiramente vis[íi]vel/i);
  });
});
