import zlib from "node:zlib";

/**
 * Minimal, test-only PNG decoder — no new dependency (uses only Node's
 * built-in zlib), supports exactly what this project's own renders
 * produce: 8-bit depth, color type 2 (RGB) or 6 (RGBA), non-interlaced.
 * Exists so the CTA-bar compositor's real pixel output can be asserted
 * on directly (owner's explicit requirement, 2026-11-24: "não considere
 * um teste de presença de texto como prova — quero ver") rather than
 * trusted as a black box. Not meant for general-purpose PNG handling.
 */
export interface DecodedPng {
  width: number;
  height: number;
  channels: 3 | 4;
  /** Row-major, top-to-bottom, left-to-right, `channels` bytes per pixel. */
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

export function decodePng(buffer: Buffer): DecodedPng {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(signature)) throw new Error("Not a PNG (bad signature)");

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
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
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      const interlace = data.readUInt8(12);
      if (interlace !== 0) throw new Error("Interlaced PNG not supported by this test-only decoder");
      if (bitDepth !== 8) throw new Error(`Only 8-bit depth supported by this test-only decoder, got ${bitDepth}`);
      if (colorType !== 2 && colorType !== 6) throw new Error(`Only RGB(2)/RGBA(6) supported by this test-only decoder, got ${colorType}`);
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataStart + length + 4; // skip CRC
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
        case 0:
          value = rawByte;
          break;
        case 1:
          value = (rawByte + a) & 0xff;
          break;
        case 2:
          value = (rawByte + b) & 0xff;
          break;
        case 3:
          value = (rawByte + Math.floor((a + b) / 2)) & 0xff;
          break;
        case 4:
          value = (rawByte + paeth(a, b, c)) & 0xff;
          break;
        default:
          throw new Error(`Unknown PNG filter type ${filterType}`);
      }
      pixels[rowStart + x] = value;
    }
    rawOffset += stride;
  }

  return { width, height, channels, pixels };
}

export function pixelAt(png: DecodedPng, x: number, y: number): { r: number; g: number; b: number; a: number } {
  const idx = (y * png.width + x) * png.channels;
  return {
    r: png.pixels[idx],
    g: png.pixels[idx + 1],
    b: png.pixels[idx + 2],
    a: png.channels === 4 ? png.pixels[idx + 3] : 255,
  };
}
