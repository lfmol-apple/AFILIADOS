import { NextResponse } from "next/server";
import { readAssetByFileName } from "@/lib/services/ai-creative-factory/creative-image-store";
import type { RouteParams } from "@/lib/next-route-types";

/**
 * Serves a generated Vitrine creative (AI-composed + programmatic
 * overlay) saved by lib/services/ai-creative-factory/creative-image-store.ts.
 * Public (no admin auth) — Meta's own catalog crawler and ad delivery
 * systems need to fetch these directly, same reasoning as the existing
 * /api/vitrine/creative/[merchantListingId] route.
 */
export async function GET(_request: Request, context: RouteParams<{ filename: string }>) {
  const { filename } = await context.params;
  const bytes = readAssetByFileName(filename);
  if (!bytes) {
    return NextResponse.json({ error: "Criativo não encontrado." }, { status: 404 });
  }
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "content-type": "image/png",
      // Versioned filename (vN) IS the cache key — a new generation gets
      // a new filename, never overwrites, so this is safe to cache hard.
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
