import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";

/**
 * Filesystem storage for generated creatives — same pattern as
 * lib/services/product-image-store.ts (bind-mounted in
 * docker-compose.prod.yml, so a rebuild never loses an image real money
 * was spent generating). Three kinds of file per (merchantListingId,
 * version): the AI base composition (kept so a price-only update never
 * needs a new OpenAI call — owner's explicit cost-control rule), and the
 * two final renders (catalog_clean, ad_overlay).
 */
function dir(): string {
  return path.isAbsolute(env.VITRINE_CREATIVE_DIR) ? env.VITRINE_CREATIVE_DIR : path.join(process.cwd(), env.VITRINE_CREATIVE_DIR);
}

function fileName(merchantListingId: string, kind: string, version: number, ext: string): string {
  return `${merchantListingId}-${kind}-v${version}.${ext}`;
}

export function saveAiBase(merchantListingId: string, version: number, bytes: Buffer): string {
  const d = dir();
  fs.mkdirSync(d, { recursive: true });
  const name = fileName(merchantListingId, "ai-base", version, "png");
  fs.writeFileSync(path.join(d, name), bytes);
  return name;
}

export function readAiBase(merchantListingId: string, version: number): Buffer | null {
  try {
    return fs.readFileSync(path.join(dir(), fileName(merchantListingId, "ai-base", version, "png")));
  } catch {
    return null;
  }
}

export function saveFinalRender(merchantListingId: string, kind: "catalog_clean" | "ad_overlay", version: number, bytes: Buffer): string {
  const d = dir();
  fs.mkdirSync(d, { recursive: true });
  const name = fileName(merchantListingId, kind, version, "png");
  fs.writeFileSync(path.join(d, name), bytes);
  return `${env.NEXT_PUBLIC_SITE_URL}/api/vitrine/creative-asset/${name}`;
}

export function readAssetByFileName(name: string): Buffer | null {
  // Defends against path traversal — a served route calls this with a
  // raw URL segment, never trusted as a safe path by construction.
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return null;
  try {
    return fs.readFileSync(path.join(dir(), name));
  } catch {
    return null;
  }
}
