import { writeFileSync } from "fs";
import { generateCreativeBase } from "../lib/services/ai-creative-factory/openai-image-client";
import { checkCreativeBudget, recordCreativeSpend } from "../lib/services/ai-creative-factory/budget";
import { renderCatalogClean, renderAdOverlay, toBuffer } from "../lib/services/ai-creative-factory/compositor";
import { buildCreativePrompt } from "../lib/services/ai-creative-factory/prompt-builder";
import { runQualityControl } from "../lib/services/ai-creative-factory/quality-control";
import { buildAuthorizedElements, describeAuthorizedElements } from "../lib/services/ai-creative-factory/authorized-elements";

// Piloto corrigido — owner's directive 2026-11-20 ("NÃO aprove a
// segunda versão do criativo"): a versão anterior deixou a IA desenhar
// a peça inteira e ela inventou um e-book bônus fictício. A regra
// central agora: a IA só pode criar cenário/ambientação (nunca
// conteúdo comercial); título, selo "6 em 1", especificação "40kg",
// preço e CTA entram inteiramente por composição programática
// (compositor.tsx). Uma auditoria visual automática (quality-
// control.ts) reprova a geração se detectar QUALQUER objeto extra —
// não depende só da instrução negativa no prompt.

const PRODUCT_TITLE = "Kit Halteres 6 Em 1 Peso Musculação Até 40kg Ajustável Halter, Kettlebell, Anilha Cor Preto-Vermelho";
const PRODUCT_BRAND = "Ahead Sports";
const PRODUCT_PHOTO_URL = "https://http2.mlstatic.com/D_NQ_NP_679906-MLA114988818772_082026-F.jpg";
const CURRENT_PRICE = 367.53;
const REFERENCE_PRICE = 1048.9;

// Lista fechada de elementos autorizados (diretiva item 1) — tudo real,
// nada inventado. "6 em 1" e "40kg" já vêm do título real do anúncio.
const authorized = buildAuthorizedElements({
  productTitle: PRODUCT_TITLE,
  brand: PRODUCT_BRAND,
  realProductPhotoUrl: PRODUCT_PHOTO_URL,
  currentPrice: CURRENT_PRICE,
  referencePrice: REFERENCE_PRICE,
  confirmedFacts: ["65% de desconto real (de R$ 1.048,90 para R$ 367,53)", "Até 40kg de peso ajustável", "6 funções em 1 produto (halter, kettlebell, anilha)"],
});

async function main() {
  const budget = await checkCreativeBudget();
  console.log("=== ORÇAMENTO ===", JSON.stringify(budget));
  if (!budget.allowed) {
    console.error("Budget not allowed:", budget.reason);
    process.exit(1);
  }

  console.log("=== LISTA FECHADA DE ELEMENTOS AUTORIZADOS ===");
  console.log(describeAuthorizedElements(authorized));

  // Prompt de CENÁRIO APENAS — a mesma disciplina já usada no resto do
  // projeto (prompt-builder.ts), nunca o prompt "desenhe tudo" do
  // piloto anterior. Nenhum benefício é passado como texto a desenhar.
  const promptText = buildCreativePrompt({
    title: PRODUCT_TITLE,
    brand: PRODUCT_BRAND,
    categoryHint: "esportes",
    currentPrice: CURRENT_PRICE,
    referencePrice: REFERENCE_PRICE,
    hasConfirmedDiscount: true,
    rating: null,
    soldQuantityLabel: null,
    impulseFit: "indeterminado",
    isSeasonalEvent: null,
  });
  console.log("=== PROMPT REAL ENVIADO À IA (cenário apenas) ===");
  console.log(promptText);

  const photoRes = await fetch(PRODUCT_PHOTO_URL);
  if (!photoRes.ok) throw new Error(`Failed to fetch product photo: HTTP ${photoRes.status}`);
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
  const photoContentType = photoRes.headers.get("content-type") ?? "image/jpeg";

  console.log("=== CHAMANDO A API REAL DA OPENAI (1 chamada paga — cenário apenas) ===");
  const generation = await generateCreativeBase({
    productPhoto: photoBuffer,
    productPhotoContentType: photoContentType,
    prompt: promptText,
  });
  await recordCreativeSpend({ amountUsd: generation.costUsd, note: "PILOTO v3 — cenário apenas + composição programática — Kit Halteres 6 em 1" });
  console.log("Custo real desta geração:", generation.costUsd, "USD");

  console.log("=== AUDITORIA AUTOMÁTICA (estrutural + objetos não autorizados) ===");
  const qc = await runQualityControl({
    generatedImageBuffer: generation.imageBuffer,
    expectedWidth: 1024,
    expectedHeight: 1536,
    originalPhotoBase64: photoBuffer.toString("base64"),
    title: PRODUCT_TITLE,
  });
  if (qc.visionCheckCostUsd) await recordCreativeSpend({ amountUsd: qc.visionCheckCostUsd, note: "Checagem visual — piloto v3" });
  console.log(JSON.stringify(qc, null, 2));

  writeFileSync(".scratch-pilot-raw.png", generation.imageBuffer);

  if (qc.status !== "approved") {
    console.log("=== REPROVADO PELA AUDITORIA — não compõe, não publica ===");
    console.log("Imagem bruta (reprovada) salva em .scratch-pilot-raw.png para inspeção.");
    return;
  }

  const dataUri = `data:image/png;base64,${generation.imageBuffer.toString("base64")}`;
  const [cleanPng, overlayPng] = await Promise.all([
    toBuffer(renderCatalogClean({ aiBaseImageDataUri: dataUri })),
    toBuffer(
      renderAdOverlay({
        aiBaseImageDataUri: dataUri,
        title: PRODUCT_TITLE,
        brand: PRODUCT_BRAND,
        currentPrice: CURRENT_PRICE,
        referencePrice: REFERENCE_PRICE,
        hasConfirmedDiscount: true,
        heroBadge: "6 EM 1",
        specBadges: ["Até 40KG ajustável"],
      }),
    ),
  ]);
  writeFileSync(".scratch-pilot-final.png", overlayPng);
  writeFileSync(".scratch-pilot-clean.png", cleanPng);
  console.log("=== APROVADO — imagens finais salvas: .scratch-pilot-final.png (ad_overlay), .scratch-pilot-clean.png (catalog_clean) ===");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exitCode = 1;
});
