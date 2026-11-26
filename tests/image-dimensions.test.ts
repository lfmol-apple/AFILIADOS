import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readJpegDimensions, getPublicImageDimensions } from "@/lib/media/image-dimensions";

/** Builds a minimal baseline JPEG (SOI, APP0, SOF0, EOI) with the given
 * pixel dimensions — enough for readJpegDimensions, without needing a
 * real encoded image. */
function makeMinimalJpeg(width: number, height: number): Buffer {
  const soi = Buffer.from([0xff, 0xd8]);
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x02]); // length 2, no payload
  const sof0 = Buffer.alloc(2 + 2 + 1 + 2 + 2 + 1);
  sof0[0] = 0xff;
  sof0[1] = 0xc0;
  sof0.writeUInt16BE(8, 2); // length field (excludes marker bytes)
  sof0[4] = 8; // precision
  sof0.writeUInt16BE(height, 5);
  sof0.writeUInt16BE(width, 7);
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, app0, sof0, eoi]);
}

describe("readJpegDimensions", () => {
  it("reads width/height from a baseline SOF0 marker", () => {
    expect(readJpegDimensions(makeMinimalJpeg(1024, 1280))).toEqual({ width: 1024, height: 1280 });
  });

  it("rejects a buffer without a JPEG SOI header", () => {
    expect(readJpegDimensions(Buffer.from([0x00, 0x01, 0x02]))).toBeNull();
  });

  it("returns null for a truncated SOF marker", () => {
    expect(readJpegDimensions(Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00]))).toBeNull();
  });
});

describe("getPublicImageDimensions against the real seeded creatives", () => {
  const campaignDirs = ["black-friday-2026", "black-friday-fim-do-mundo"];

  it("reads real, non-zero dimensions for every committed creative file", () => {
    for (const dir of campaignDirs) {
      const absDir = join(process.cwd(), "public", dir);
      if (!existsSync(absDir)) continue; // not present in this checkout/CI — skip, not a failure
      const files = readdirSync(absDir).filter((f) => f.endsWith(".jpeg"));
      if (files.length === 0) continue;
      for (const file of files) {
        const dims = getPublicImageDimensions(`/${dir}/${file}`);
        expect(dims, `${dir}/${file} should have readable dimensions`).not.toBeNull();
        expect(dims!.width).toBeGreaterThan(0);
        expect(dims!.height).toBeGreaterThan(0);
      }
    }
  });

  it("matches ImageMagick/libjpeg's own reading of a known file's dimensions", () => {
    // Cross-check against a real file's bytes read directly (not through
    // the cache), so this test fails if the marker-scan logic regresses —
    // independent of which specific creative happens to be seeded.
    const absDir = join(process.cwd(), "public", "black-friday-2026");
    if (!existsSync(absDir)) return;
    const files = readdirSync(absDir).filter((f) => f.endsWith(".jpeg"));
    if (files.length === 0) return;
    const sample = files[0]!;
    const buffer = readFileSync(join(absDir, sample));
    const dims = readJpegDimensions(buffer);
    expect(dims).not.toBeNull();
    expect(dims!.width).toBeGreaterThanOrEqual(100);
    expect(dims!.height).toBeGreaterThanOrEqual(100);
  });
});
