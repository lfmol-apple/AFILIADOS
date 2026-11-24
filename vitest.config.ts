import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    setupFiles: ["tests/setup.ts"],
    // Real root cause confirmed 2026-11-23: several integration tests
    // (tests/ml-token-store.test.ts, tests/ml-oauth.test.ts,
    // tests/automation-operational-v1.test.ts, tests/product-matcher-
    // shadow-job.test.ts) mutate REAL, singleton-unique-keyed rows in the
    // same local dev Postgres database (e.g. IntegrationCredential{
    // provider:"MERCADO_LIVRE"}) or take the same runJob() advisory lock —
    // there is no per-file DB sandboxing, so running test FILES in
    // parallel (vitest's default) lets two files race on the same real
    // row/lock and read back whichever one won, which is exactly the
    // "expected winner-token, got test-access-token" flakiness this
    // closes. Disabling file parallelism (files still run fast, just one
    // at a time) removes the race by construction instead of masking it
    // with retries or weakened assertions.
    fileParallelism: false,
  },
});
