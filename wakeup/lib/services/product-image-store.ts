import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";
import { isValidAsin } from "@/lib/amazon/policy-guard";

/**
 * Real product photos for a MANUAL_VERIFIED Amazon product, saved from
 * WhatsApp's own link-preview thumbnail (`message.extendedTextMessage.
 * jpegThumbnail` / `imageMessage.jpegThumbnail`) — WhatsApp's servers
 * fetched that thumbnail directly from the real amazon.com.br product
 * page when generating the link preview, so it's a directly-observed
 * fact, not something this project guessed or scraped itself. Found
 * live, 2026-11-18: manual-product-registration.ts has no image input
 * at all (deliberate — no legitimate source existed before this), and
 * this project hotlinks every other merchant's own CDN for imageUrl
 * rather than hosting images itself, so there was nowhere to put a
 * decoded thumbnail until now.
 *
 * Saved to disk (PRODUCT_IMAGE_DIR, bind-mounted in production so a
 * rebuild never loses it — see docker-compose.prod.yml), served back
 * through app/api/product-images/[asin]/route.ts. One file per ASIN:
 * re-harvesting the same product overwrites it with the newest
 * thumbnail seen, never accumulates duplicates.
 */
function imageDir(): string {
  return path.isAbsolute(env.PRODUCT_IMAGE_DIR)
    ? env.PRODUCT_IMAGE_DIR
    : path.join(process.cwd(), env.PRODUCT_IMAGE_DIR);
}

function imagePath(asin: string): string {
  return path.join(imageDir(), `${asin}.jpg`);
}

export function hasStoredProductImage(asin: string): boolean {
  return isValidAsin(asin) && fs.existsSync(imagePath(asin));
}

export function readStoredProductImage(asin: string): Buffer | null {
  if (!isValidAsin(asin)) return null;
  try {
    return fs.readFileSync(imagePath(asin));
  } catch {
    return null;
  }
}

/** Saves the decoded JPEG bytes and returns the public URL to store on
 * Product.imageUrl — absolute, since every other merchant's imageUrl in
 * this codebase is also an absolute URL (their own CDN's), never a
 * relative path. Refuses silently (returns null) for an invalid ASIN or
 * suspiciously tiny/empty bytes — never writes a broken "photo". */
export function saveProductImage(asin: string, bytes: Uint8Array): string | null {
  if (!isValidAsin(asin) || bytes.length < 200) return null;
  const dir = imageDir();
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(imagePath(asin), bytes);
  return `${env.NEXT_PUBLIC_SITE_URL}/api/product-images/${asin}.jpg`;
}
