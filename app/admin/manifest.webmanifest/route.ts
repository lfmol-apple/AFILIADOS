import { NextResponse } from "next/server";

/**
 * A second, admin-only manifest — Next's manifest.ts file convention only
 * covers one manifest at the app root, and that one's start_url ("/") is
 * what iOS actually opens even when "Add to Home Screen" is tapped from a
 * different page (a documented Safari quirk: once a page links a manifest,
 * iOS launches the manifest's start_url, not the page you were on). Linked
 * from app/admin/page.tsx's own metadata.manifest, so only a shortcut added
 * from /admin picks this one up and opens straight there.
 */
export async function GET() {
  return NextResponse.json(
    {
      name: "PreçoCaindo — Admin",
      short_name: "Admin",
      start_url: "/admin",
      scope: "/admin",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#0f766e",
      icons: [
        { src: "/logo-icon.png", sizes: "256x256", type: "image/png" },
        { src: "/icon.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
