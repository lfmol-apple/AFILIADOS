import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Minimal, dependency-free JPEG dimension reader (scans for the SOF0–
 * SOF15 marker). Every Black Friday creative is a JPEG exported from
 * WhatsApp — this avoids pulling in sharp/image-size for a single
 * read-only admin diagnostic (crop-risk reporting in
 * BlackFridayFeedSimulator).
 */
export function readJpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1]!;
    // Markers with no payload length to skip (padding, RSTn).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      offset += 2;
      continue;
    }
    if (marker === 0xd9 /* EOI */) break;
    if (offset + 4 > buffer.length) break;
    const length = buffer.readUInt16BE(offset + 2);
    const isSof =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (offset + 9 > buffer.length) return null;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
}

const dimensionsCache = new Map<string, ImageDimensions | null>();

/**
 * Reads a creative's real pixel dimensions from `public/<storedPath>`.
 * Cached in-memory for the life of the process — creative files are
 * hash-named and never rewritten (see scripts/seed-black-friday-*.ts),
 * so a given path's dimensions never change while the server runs.
 */
export function getPublicImageDimensions(storedPath: string): ImageDimensions | null {
  const cached = dimensionsCache.get(storedPath);
  if (cached !== undefined) return cached;
  const filePath = join(process.cwd(), "public", storedPath.replace(/^\/+/, ""));
  let result: ImageDimensions | null = null;
  if (existsSync(filePath)) {
    try {
      result = readJpegDimensions(readFileSync(filePath));
    } catch {
      result = null;
    }
  }
  dimensionsCache.set(storedPath, result);
  return result;
}
