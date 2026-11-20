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

const PRODUCT_PHOTO_URL = "https://http2.mlstatic.com/D_NQ_NP_679906-MLA114988818772_082026-F.jpg";
const STYLE_REFERENCE_PATH =
  process.env.HENRIQUE_STYLE_REFERENCE_PATH ?? "/Users/leonardomol/Downloads/henrique-refs/Imagem do ChatGPT 20 de nov. de 2026, 16_21_43.png";

// Owner's correction, 2026-11-20: the first pilot pick (pressure
// washer) coincided with the exact category of two of Henrique's own
// references — that proves nothing about generalization. This pilot
// uses a fitness/weights kit instead, a category with NO match among
// the 15 real references, and reuses the Philips OneBlade reference
// only as a loose structural anchor (its "5 em 1" pill badge + bare-
// line icon list, since this product also advertises a multi-function
// "6 em 1" claim) — adapted per henrique-visual-profile.ts's own rule
// that layout/icon choices follow what's real about THIS product, not
// a same-category copy.
const PROMPT = `Crie um anúncio publicitário comercial vertical para Instagram/Facebook. Use a segunda imagem fornecida (uma arte real já aprovada, de um aparador Philips OneBlade) apenas como referência ESTRUTURAL solta: tipografia bold em destaque, um selo/pílula colorida grande para uma característica "N em 1", e uma lista de ícones de linha coloridos sem fundo, cada um ao lado de um rótulo curto. Não copie o produto, a marca, as cores específicas ou o layout exato dessa referência — ela só mostra o PADRÃO DE QUALIDADE esperado.

O produto real está na PRIMEIRA imagem fornecida: "Kit Halteres 6 Em 1 Peso Musculação Até 40kg Ajustável Halter, Kettlebell, Anilha Cor Preto-Vermelho", marca Ahead Sports. Preserve o produto exatamente como aparece na foto — mesma cor, formato e proporções. Não redesenhe nem altere o produto.

Escolha uma paleta de cores e ambientação adequadas a equipamento de musculação/academia (tons escuros, vermelho e preto, sensação de energia e força — igual à cor real do produto). Inclua:
- Título do produto em destaque, bold, duas linhas, duas cores.
- Um selo/pílula grande destacando "6 EM 1" (fato real do próprio anúncio).
- De 2 a 3 ícones de linha coloridos (sem fundo em círculo), cada um desenhando literalmente um benefício real: peso ajustável até 40kg, versatilidade (halter + kettlebell + anilha em um produto só). Rótulo curto de 2-4 palavras ao lado de cada ícone.
- Produto grande e centralizado, ocupando a maior parte da composição.
- Selo de preço vermelho e amarelo bem legível: "Por apenas" + preço real "R$ 367,53", e menor e riscado o preço anterior real "R$ 1.048,90".
- No rodapé, uma faixa amarela horizontal com o logotipo real do Mercado Livre (ícone de aperto de mãos) e um botão azul-marinho arredondado "Compre agora no Mercado Livre".

Não invente avaliação, quantidade vendida ou certificação — não há dado real disponível para isso, então NÃO inclua nenhuma menção a nota ou vendas. Não use "últimas unidades" ou qualquer urgência artificial.

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
  await recordCreativeSpend({ amountUsd: generation.costUsd, note: "PILOTO — calibração visual Henrique — Kit Halteres 6 em 1" });
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
