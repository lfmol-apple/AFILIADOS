import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";

/**
 * Remembers which WhatsApp message ids jobs/whatsapp-harvest.ts already
 * processed, so a short poll-connect-disconnect cycle that happens to see
 * the same queued message twice (offline-message redelivery) never
 * re-runs the Shopee/ML pipeline on it. Cheap insurance, not a hard
 * requirement — lib/services/whatsapp-group-harvest.ts's own writes are
 * already idempotent (upsert-based) either way. Same disposable-JSON-
 * file pattern as lib/services/whatsapp-group-batch-store.ts.
 */
const MAX_IDS = 1000;

function storePath(): string {
  const dir = path.isAbsolute(env.WHATSAPP_SESSION_DIR)
    ? path.dirname(env.WHATSAPP_SESSION_DIR)
    : path.join(process.cwd(), path.dirname(env.WHATSAPP_SESSION_DIR));
  return path.join(dir, "whatsapp-harvest-seen.json");
}

export function loadSeenHarvestMessageIds(): Set<string> {
  try {
    const raw = fs.readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markHarvestMessagesSeen(ids: string[]): void {
  if (ids.length === 0) return;
  const existing = loadSeenHarvestMessageIds();
  for (const id of ids) existing.add(id);
  const trimmed = [...existing].slice(-MAX_IDS);
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(trimmed), "utf8");
}
