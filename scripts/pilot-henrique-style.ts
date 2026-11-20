import { writeFileSync } from "fs";
import { generateCreativeBase } from "../lib/services/ai-creative-factory/openai-image-client";
import { checkCreativeBudget, recordCreativeSpend } from "../lib/services/ai-creative-factory/budget";
import { renderCatalogClean, toBuffer } from "../lib/services/ai-creative-factory/compositor";

// Piloto único — owner's directive 2026-11-20 ("Calibração Visual da
// Fábrica de Criativos com as Artes do Henrique"): a IA desenha a peça
// inteira (título, ícones, preço, logos), usando uma arte real e já
// aprovada do Henrique (mesma categoria/marca) como referência de
// estilo literal — não uma composição programática por cima de uma
// foto gerada sem direção visual real. Uma chamada paga só, autorizada.

const PRODUCT_PHOTO_URL = "https://http2.mlstatic.com/D_NQ_NP_865507-MLA99367780510_112025-F.jpg";
const STYLE_REFERENCE_PATH =
  process.env.HENRIQUE_STYLE_REFERENCE_PATH ?? "/Users/leonardomol/Downloads/henrique-refs/Imagem do ChatGPT 20 de nov. de 2026, 16_20_49.png";

// Third pilot product, 2026-11-20 (owner: "escolha outro produto e
// gere mais uma"): a paint sprayer — a tools category different from
// both prior pilots (pressure washer, weights kit). Reuses the
// Electrolux EasyWash reference as a loose structural anchor (icon-in-
// colored-square + label list, same "ferramentas" category direction
// already in prompt-builder.ts) — not a same-category copy, since no
// paint sprayer exists among Henrique's 15 references.
const PROMPT = `Crie um anúncio publicitário comercial vertical para Instagram/Facebook. Use a segunda imagem fornecida (uma arte real já aprovada, de uma lavadora de alta pressão Electrolux) apenas como referência ESTRUTURAL solta: tipografia bold em destaque, ícones dentro de quadrados coloridos com cantos arredondados, cada um ao lado de um rótulo curto de 2 linhas. Não copie o produto, a marca, as cores específicas ou o layout exato dessa referência — ela só mostra o PADRÃO DE QUALIDADE esperado.

O produto real está na PRIMEIRA imagem fornecida: "Pistola de pulverização elétrica para pintura hvlp Tssaper TP550 800mL cor azul-turquesa 550W", marca Tssaper. Preserve o produto exatamente como aparece na foto — mesma cor azul-turquesa, formato e proporções. Não redesenhe nem altere o produto.

Escolha uma paleta de cores e ambientação adequadas a ferramenta de pintura/bricolagem (tons que combinem com o azul-turquesa real do produto, ambiente de oficina ou pintura, sensação prática e profissional). Inclua:
- Título do produto em destaque, bold, duas linhas, duas cores.
- De 2 a 3 ícones (em quadrados coloridos com cantos arredondados) ao lado de um rótulo curto, cada um desenhando literalmente um benefício real: potência 550W, capacidade do reservatório 800ml. Rótulo curto de 2-4 palavras ao lado de cada ícone.
- Produto grande e centralizado, ocupando a maior parte da composição.
- Selo de preço vermelho e amarelo bem legível: "Por apenas" + preço real "R$ 228,90", e menor e riscado o preço anterior real "R$ 376,70".
- No rodapé, uma faixa amarela horizontal com o logotipo real do Mercado Livre (ícone de aperto de mãos) e um botão azul-marinho arredondado "Compre agora no Mercado Livre".

Não invente avaliação, quantidade vendida ou certificação — não há dado real disponível para isso, então NÃO inclua nenhuma menção a nota ou vendas. Não use "últimas unidades" ou qualquer urgência artificial. Não adicione nenhum objeto, produto, embalagem, acessório, brinde ou item extra que não esteja fisicamente presente na foto original do produto.

IMPORTANTE sobre enquadramento: esta imagem será cortada posteriormente para a proporção 4:5 (a borda superior e a borda inferior serão removidas). Deixe uma margem vazia, neutra, SEM NENHUM elemento (sem logotipo, sem texto, sem o banner) ocupando os 18% superiores e os 18% inferiores da altura total da imagem. Todo elemento crítico — título, logotipo, selo de preço, banner do Mercado Livre — deve estar inteiramente dentro dos 64% centrais da altura.`;

async function main() {
  const budget = await checkCreativeBudget();
  console.log("=== ORÇAMENTO ===", JSON.stringify(budget));
  if (!budget.allowed) {
    console.error("Budget not allowed:", budget.reason);
    process.exit(1);
  }

  console.log("=== PROMPT REAL ENVIADO À IA ===");
  console.log(PROMPT);

  const [photoRes, styleRes] = await Promise.all([
    fetch(PRODUCT_PHOTO_URL),
    (async () => {
      const { readFileSync } = await import("fs");
      return { buffer: readFileSync(STYLE_REFERENCE_PATH), contentType: "image/png" };
    })(),
  ]);
  if (!photoRes.ok) throw new Error(`Failed to fetch product photo: HTTP ${photoRes.status}`);
  const photoBuffer = Buffer.from(await photoRes.arrayBuffer());
  const photoContentType = photoRes.headers.get("content-type") ?? "image/jpeg";

  console.log("=== CHAMANDO A API REAL DA OPENAI (1 chamada paga) ===");
  const generation = await generateCreativeBase({
    productPhoto: photoBuffer,
    productPhotoContentType: photoContentType,
    prompt: PROMPT,
    styleReferencePhoto: styleRes.buffer,
    styleReferencePhotoContentType: styleRes.contentType,
  });
  await recordCreativeSpend({ amountUsd: generation.costUsd, note: "PILOTO — calibração visual Henrique — Pistola de pintura HVLP Tssaper" });
  console.log("Custo real desta geração:", generation.costUsd, "USD");

  writeFileSync(".scratch-pilot-raw.png", generation.imageBuffer);
  console.log("Imagem bruta (sem corte) salva em .scratch-pilot-raw.png");

  const dataUri = `data:image/png;base64,${generation.imageBuffer.toString("base64")}`;
  const cropped = await toBuffer(renderCatalogClean({ aiBaseImageDataUri: dataUri }));
  writeFileSync(".scratch-pilot-final.png", cropped);
  console.log("Imagem final 1080x1350 salva em .scratch-pilot-final.png");
}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exitCode = 1;
});
