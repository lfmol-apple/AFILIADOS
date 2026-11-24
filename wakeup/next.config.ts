import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project so Turbopack doesn't pick up an
  // unrelated package-lock.json that happens to live above it in the
  // filesystem (outside this git repository).
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Produces .next/standalone — a minimal, self-contained server bundle
  // with only the traced dependencies, used by the production Dockerfile.
  // See docs/DEPLOYMENT.md.
  output: "standalone",
};

export default nextConfig;
