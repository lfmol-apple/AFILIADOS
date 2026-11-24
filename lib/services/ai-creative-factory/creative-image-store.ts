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

/** Owner's directive, 2026-11-24 ("arquivo ausente, corrompido ou
 * inválido" as one of the only legitimate reasons to force a
 * regeneration): the cheapest real validity check — does the exact file
 * this row's version claims to have saved actually exist on disk, with
 * non-zero size? This is precisely the thing that broke once already
 * (an ad-hoc `docker run` without the host bind mount lost a batch of
 * "approved" rows' real files — see scripts/run-vitrine-cron.sh's own
 * incident note) — a DB row saying "approved" is not proof the bytes are
 * actually there. Deliberately NOT a deeper validity check (image
 * decode, dimension re-verification, etc.) — the owner asked for the
 * cheapest real check, not a new architecture. */
export function finalRenderExists(merchantListingId: string, kind: "catalog_clean" | "ad_overlay", version: number): boolean {
  try {
    const stats = fs.statSync(path.join(dir(), fileName(merchantListingId, kind, version, "png")));
    return stats.isFile() && stats.size > 0;
  } catch {
    return false;
  }
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
