/**
 * Minimal structured logging — one JSON line per event to stdout/stderr,
 * suitable for `journalctl`/`docker logs`/any log shipper without adding a
 * dependency (project brief: "Não adicionar Datadog/Sentry/etc.
 * automaticamente"). Scoped to the specific events the project brief asks
 * for: startup, jobs, provider errors, database errors, affiliate
 * redirects, suspicious admin login activity — not a general-purpose
 * logging framework.
 *
 * `redact()` is a safety net, not the primary control: callers are still
 * responsible for never passing a password/token/cookie/secret/full IP in
 * `data` in the first place (see app/api/admin/login/route.ts for the
 * pattern — IPs are reduced to "redacted" before they ever reach here).
 * This just catches an accidentally-named field before it hits a log line.
 */

type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY_FRAGMENTS = [
  "password",
  "token",
  "cookie",
  "secret",
  "apikey",
  "api_key",
  "authorization",
  "session",
];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function redact(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = isSensitiveKey(key) ? "[redacted]" : value;
  }
  return out;
}

function emit(level: LogLevel, event: string, data: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    event,
    ts: new Date().toISOString(),
    ...redact(data),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, data: Record<string, unknown> = {}) => emit("info", event, data),
  warn: (event: string, data: Record<string, unknown> = {}) => emit("warn", event, data),
  error: (event: string, data: Record<string, unknown> = {}) => emit("error", event, data),
};
