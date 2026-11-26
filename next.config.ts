import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project so Turbopack doesn't pick up an
  // unrelated package-lock.json that happens to live above it in the
  // filesystem (outside this git repository).
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Dev-only: `next dev` was blocking its own JS chunks as "cross-origin"
  // requests (see the dev server log), which silently broke client
  // hydration — e.g. the admin login form's submit handler never
  // attached, so clicking "Entrar" did nothing. Has no effect in
  // production (next start ignores this).
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Produces .next/standalone — a minimal, self-contained server bundle
  // with only the traced dependencies, used by the production Dockerfile.
  // See docs/DEPLOYMENT.md.
  output: "standalone",
};

export default nextConfig;
