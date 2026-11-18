import fs from "node:fs";
import path from "node:path";
import { env } from "@/lib/config/env";
import type { WhatsAppMessageKey } from "@/lib/services/whatsapp-sender";

/**
 * Remembers the message keys of the last WHATSAPP_DIGEST batch posted to
 * the Group, so the next run can revoke them before posting a fresh one
 * (owner's brief, 2026-11-18: never show two days of offers — some
 * already stale — in the Group at once). Lives next to the WhatsApp
 * session on disk (same bind-mounted data/ volume in production), not in
 * Postgres — this is disposable, best-effort bookkeeping, not a record
 * worth a migration.
 */
function storePath(): string {
  const dir = path.isAbsolute(env.WHATSAPP_SESSION_DIR)
    ? path.dirname(env.WHATSAPP_SESSION_DIR)
    : path.join(process.cwd(), path.dirname(env.WHATSAPP_SESSION_DIR));
  return path.join(dir, "whatsapp-group-last-batch.json");
}

export function loadLastGroupBatchKeys(): WhatsAppMessageKey[] {
  try {
    const raw = fs.readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLastGroupBatchKeys(keys: WhatsAppMessageKey[]): void {
  const file = storePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(keys), "utf8");
}
