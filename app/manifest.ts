import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

/**
 * Lets the owner add the site to an iPhone/Android home screen as an app —
 * the only way iOS Safari allows Web Push (Settings > Notifications don't
 * exist for a plain browser tab). See components/push-notifications-manager.tsx
 * and docs/PWA note in /admin/notificacoes.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    icons: [
      { src: "/logo-icon.png", sizes: "256x256", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
