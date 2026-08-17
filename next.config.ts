import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project so Turbopack doesn't pick up an
  // unrelated package-lock.json that happens to live above it in the
  // filesystem (outside this git repository).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
