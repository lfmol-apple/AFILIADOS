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

const PRODUCT_PHOTO_URL = "https://http2.mlstatic.com/D_NQ_NP_774257-MLA99966448927_112025-F.jpg";
const STYLE_REFERENCE_PATH = "/Users/leonardomol/Downloads/henrique-refs/Imagem do ChatGPT 20 de nov. de 2026, 16_20_49.png";

const PROMPT = `Crie um anúncio publicitário comercial vertical para Instagram/Facebook, seguindo EXATAMENTE o padrão visual, cores, tipografia, ícones e composição da segunda imagem fornecida (uma arte real já aprovada, de uma lavadora de alta pressão Electrolux).

Troque o conteúdo pelo produto real da PRIMEIRA imagem fornecida: "Lavadora de Alta Pressão Electrolux 1850PSI 1500W Potência com Canhão de Espuma PowerWash EWS1850P Preta". Preserve o produto exatamente como aparece na foto — mesma embalagem, cor, proporções e logotipo Electrolux. Não redesenhe nem alt ere o produto.

Mantenha a MESMA estrutura da referência: logotipo real "Electrolux" no topo, título em duas linhas usando duas cores (seguindo a paleta azul/amarelo do produto), de 2 a 4 ícones de benefício reais à esquerda — cada um desenhando literalmente o benefício (alta pressão/1850 PSI, economia de água, limpeza automotiva eficiente), nunca um círculo vazio. Produto grande e centralizado à direita, com os acessórios reais do produto dispostos ao redor, como na referência.

Inclua um selo de preço vermelho e amarelo bem legível, com o texto "Por apenas" seguido do preço real "R$ 450,53" e, menor e riscado, o preço anterior real "R$ 698,57".

No rodapé, uma faixa amarela horizontal com o logotipo real do Mercado Livre (ícone de aperto de mãos) e um botão azul-marinho arredondado "Compre agora no Mercado Livre", exatamente como na referência.

Não invente avaliação, quantidade vendida ou certificação. Não use "últimas unidades" ou qualquer urgência artificial — só os fatos reais acima.

IMPORTANTE sobre enquadramento: esta imagem será cortada posteriormente para a proporção 4:5. Mantenha todos os elementos críticos (preço, banner, logotipo, título) dentro dos 80% centrais da altura da imagem — evite colocar qualquer elemento importante nos 10% superiores ou inferiores.`;

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
  await recordCreativeSpend({ amountUsd: generation.costUsd, note: "PILOTO — calibração visual Henrique — Lavadora Electrolux" });
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
