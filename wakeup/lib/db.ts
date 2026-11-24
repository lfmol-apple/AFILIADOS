import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/** Opt-in only (scripts/performance-acquisition-check.ts) — emits a
 * "query" event per statement so a diagnostic script can count real
 * round-trips against the exact client the app uses, instead of a
 * separately-constructed one that would miss them entirely. Never enabled
 * by default; does not change logging behavior for the running app. */
const queryEventLogging = process.env.PRISMA_LOG_QUERIES === "true";

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: queryEventLogging
      ? [{ emit: "event", level: "query" }, "warn", "error"]
      : process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
