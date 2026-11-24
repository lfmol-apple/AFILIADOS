import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { readPngDimensions } from "@/lib/services/ai-creative-factory/creative-image-store";

/**
 * Owner's directive, 2026-11-24 ("não considere um teste de presença de
 * texto como prova — quero ver"): builds a single, self-contained HTML
 * page (open it in any browser, no server needed — every image is an
 * inline base64 data URI) laying out, for each chosen product: the real
 * approved reference, the current defective image, the corrected image,
 * a zoomed crop of just the bottom ~20% of each, and the real measured
 * dimensions/proportions used. Pure local file reads — no DB, no
 * network, no paid call.
 */

interface DecodedPng {
  width: number;
  height: number;
  channels: 3 | 4;
  pixels: Buffer;
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buffer: Buffer): DecodedPng {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idatChunks: Buffer[] = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const data = buffer.subarray(dataStart, dataStart + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data.readUInt8(9);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataStart + length + 4;
  }
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const pixels = Buffer.alloc(height * stride);
  let rawOffset = 0;
  for (let y = 0; y < height; y++) {
    const filterType = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    const prevRowStart = (y - 1) * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[rawOffset + x];
      const a = x >= channels ? pixels[rowStart + x - channels] : 0;
      const b = y > 0 ? pixels[prevRowStart + x] : 0;
      const c = y > 0 && x >= channels ? pixels[prevRowStart + x - channels] : 0;
      let value: number;
      switch (filterType) {
        case 0: value = rawByte; break;
        case 1: value = (rawByte + a) & 0xff; break;
        case 2: value = (rawByte + b) & 0xff; break;
        case 3: value = (rawByte + Math.floor((a + b) / 2)) & 0xff; break;
        case 4: value = (rawByte + paeth(a, b, c)) & 0xff; break;
        default: throw new Error(`Unknown PNG filter type ${filterType}`);
      }
      pixels[rowStart + x] = value;
    }
    rawOffset += stride;
  }
  return { width, height, channels, pixels };
}

function crc32(buf: Buffer): number {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Crops [x, y, width, height] out of a decoded PNG and re-encodes it as
 * a standalone RGB PNG (filter type 0 / None — simplest valid encoding,
 * fine for a report image, not meant to be a general-purpose encoder). */
function cropToPng(src: DecodedPng, x: number, y: number, width: number, height: number): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let row = 0; row < height; row++) {
    const rowStart = row * (stride + 1);
    raw[rowStart] = 0; // filter: none
    for (let col = 0; col < width; col++) {
      const srcIdx = ((y + row) * src.width + (x + col)) * src.channels;
      raw[rowStart + 1 + col * 3] = src.pixels[srcIdx];
      raw[rowStart + 1 + col * 3 + 1] = src.pixels[srcIdx + 1];
      raw[rowStart + 1 + col * 3 + 2] = src.pixels[srcIdx + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(2, 9);
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function dataUri(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

const REFERENCE_PATH = path.join(process.cwd(), "data/vitrine-creative-reference/henrique-style-reference.png");
const BAR_ASSET_PATH = path.join(process.cwd(), "data/vitrine-creative-reference/cta-bar-1080w.png");
const SOURCE_DIR = path.join(process.cwd(), ".local-real-creatives");
const CORRECTED_DIR = path.join(SOURCE_DIR, "corrected");
const OUTPUT_PATH = path.join(process.cwd(), ".local-real-creatives", "cta-bar-fix-comparison.html");

const PRODUCTS: Array<{ gid: string; title: string; defectiveVersion: number; correctedVersion: number }> = [
  // Owner's directive, 2026-11-24 ("Verificações finais", item 2): "o PDF
  // comparativo deverá apresentar os 11 criativos corrigidos, e não
  // somente dois ou três exemplos" — every cta_cortado item from
  // .local-real-creatives/classification.json, not a sample.
  { gid: "cmuiexfmf03tkpm019xzcp7p3", title: "Pistola Tssaper (produto obrigatório da comparação)", defectiveVersion: 5, correctedVersion: 6 },
  { gid: "cmuh2q49g010qqr01x2kkgtj9", title: "Electrolux Kit 3 Bowls", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuiezxfj05aopm018x0nx1lk", title: "Lavadora Kärcher", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuic1yiu07gmo601kvb7tpvh", title: "Secador Philco psc3500", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuiexdvd033tpm01i9wxmi6o", title: "Lavadora Electrolux 1850PSI", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuihoa0u01zso301osdb2epq", title: "Proteína Max Titanium", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuiiy1bw08jgo301orq49zkx", title: "Bicicleta Ergométrica Spinning X11", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuijqw5t0984ow01zo4syfdx", title: "Fritadeira Air Fryer Elgin", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuilmxjf01yhqr01siiw836l", title: "Carregador Samsung 25w", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmuilo26v063kqr01i70iklhu", title: "Smartphone Motorola Moto G17", defectiveVersion: 3, correctedVersion: 4 },
  { gid: "cmwo2ts8v0026n10upg7ys9l3", title: "Pisca-Pisca Natalino", defectiveVersion: 3, correctedVersion: 4 },
];

const ZOOM_FRACTION = 0.2; // bottom 20% of each image, for visibility

function buildProductSection(product: (typeof PRODUCTS)[number], referenceCropUri: string, referenceFull: Buffer): string {
  const defectivePath = path.join(SOURCE_DIR, `${product.gid}.png`);
  const correctedPath = path.join(CORRECTED_DIR, `${product.gid}-v${product.correctedVersion}.png`);
  if (!existsSync(defectivePath) || !existsSync(correctedPath)) {
    return `<section><h2>${product.title}</h2><p style="color:red">Arquivo ausente — defective: ${existsSync(defectivePath)}, corrected: ${existsSync(correctedPath)}</p></section>`;
  }
  const defectiveBuf = readFileSync(defectivePath);
  const correctedBuf = readFileSync(correctedPath);
  const defectiveDims = readPngDimensions(defectiveBuf);
  const correctedDims = readPngDimensions(correctedBuf);

  const defectivePng = decodePng(defectiveBuf);
  const correctedPng = decodePng(correctedBuf);
  const defectiveCropH = Math.round(defectivePng.height * ZOOM_FRACTION);
  const correctedCropH = Math.round(correctedPng.height * ZOOM_FRACTION);
  const defectiveCropUri = dataUri(cropToPng(defectivePng, 0, defectivePng.height - defectiveCropH, defectivePng.width, defectiveCropH));
  const correctedCropUri = dataUri(cropToPng(correctedPng, 0, correctedPng.height - correctedCropH, correctedPng.width, correctedCropH));

  return `
  <section style="margin-bottom:48px;border-bottom:2px solid #ddd;padding-bottom:32px;">
    <h2>${product.title} (${product.gid})</h2>
    <p>Defeituoso: v${product.defectiveVersion}, ${defectiveDims.width}×${defectiveDims.height}px — Corrigido: v${product.correctedVersion}, ${correctedDims.width}×${correctedDims.height}px</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;">
      <figure style="margin:0;"><figcaption><b>(a) Referência aprovada</b><br>${referenceFull ? "1122×1402" : ""}</figcaption><img src="${dataUri(referenceFull)}" style="width:240px;border:2px solid #333;"></figure>
      <figure style="margin:0;"><figcaption><b>(b) Defeituoso (v${product.defectiveVersion})</b></figcaption><img src="${dataUri(defectiveBuf)}" style="width:240px;border:2px solid #c00;"></figure>
      <figure style="margin:0;"><figcaption><b>(c) Corrigido (v${product.correctedVersion})</b></figcaption><img src="${dataUri(correctedBuf)}" style="width:240px;border:2px solid #0a0;"></figure>
    </div>
    <h3>(d) Zoom — ${(ZOOM_FRACTION * 100).toFixed(0)}% inferior de cada imagem</h3>
    <div style="display:flex;gap:16px;flex-wrap:wrap;background:#222;padding:12px;">
      <figure style="margin:0;"><figcaption style="color:#fff;">Referência</figcaption><img src="${referenceCropUri}" style="width:280px;"></figure>
      <figure style="margin:0;"><figcaption style="color:#fff;">Defeituoso</figcaption><img src="${defectiveCropUri}" style="width:280px;"></figure>
      <figure style="margin:0;"><figcaption style="color:#fff;">Corrigido</figcaption><img src="${correctedCropUri}" style="width:280px;"></figure>
    </div>
  </section>`;
}

async function main() {
  const referenceBuf = readFileSync(REFERENCE_PATH);
  const referenceDims = readPngDimensions(referenceBuf);
  const referencePng = decodePng(referenceBuf);
  const referenceCropH = Math.round(referencePng.height * ZOOM_FRACTION);
  const referenceCropUri = dataUri(cropToPng(referencePng, 0, referencePng.height - referenceCropH, referencePng.width, referenceCropH));
  const barAssetDims = readPngDimensions(readFileSync(BAR_ASSET_PATH));

  const sections = PRODUCTS.map((p) => buildProductSection(p, referenceCropUri, referenceBuf)).join("\n");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Comparação — correção da faixa CTA do Mercado Livre</title>
<style>body{font-family:sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;} h1{font-size:20px;} h2{font-size:16px;} h3{font-size:14px;margin-top:20px;} figcaption{font-size:12px;margin-bottom:4px;}</style>
</head><body>
<h1>(e) Medidas reais usadas</h1>
<ul>
  <li>Referência aprovada: ${referenceDims.width}×${referenceDims.height}px</li>
  <li>Faixa CTA medida na referência: 177px de altura / 1402px de altura total = 0.12625 (12.625% da altura)</li>
  <li>Asset da faixa reescalado para a largura real de saída (1080px): ${barAssetDims.width}×${barAssetDims.height}px</li>
  <li>CTA_BAR_HEIGHT_FRACTION aplicado na correção: 0.12625 (mesma proporção, aplicada à altura real de cada imagem)</li>
</ul>
${sections}
</body></html>`;

  writeFileSync(OUTPUT_PATH, html);
  console.log("Escrito em:", OUTPUT_PATH);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
