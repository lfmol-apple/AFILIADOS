import path from "node:path";
import type { WASocket } from "baileys";
import type { Boom } from "@hapi/boom";
import pino from "pino";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/observability/logger";

/**
 * Unofficial WhatsApp integration (owner's call, 2026-11-15, explicit —
 * Meta's own Groups/Channels API doesn't fit: Groups cap at 8 participants
 * and Channels have no official send API at all). baileys implements the
 * real multi-device WhatsApp Web protocol directly — this is the same
 * kind of "automate a platform without API access" risk flagged earlier
 * for Mercado Livre's robots.txt, except here the owner explicitly chose
 * to accept it (number can get banned) after being told the tradeoff.
 *
 * The session (private keys, not a revokable token) lives under
 * WHATSAPP_SESSION_DIR, created once by scripts/whatsapp-pair.ts via a
 * real QR-code scan on the owner's phone — never committed, never baked
 * into a Docker image (see .gitignore), bind-mounted in production so it
 * survives every rebuild.
 *
 * baileys (`"type": "module"`) is loaded via a dynamic `await import()`
 * everywhere in this file, never a static top-level import: confirmed
 * live, 2026-11-15, that a static import makes tsx resolve one of
 * baileys' own transitive deps (whatsapp-rust-bridge, ESM-only) through
 * Node's CJS resolver and crash with ERR_PACKAGE_PATH_NOT_EXPORTED —
 * every job in this project runs via `tsx file.ts`, so this isn't
 * optional. A dynamic import routes through Node's real ESM loader
 * instead and resolves cleanly (verified with both the named exports and
 * the default export).
 */
const silentLogger = pino({ level: "silent" });

export class WhatsAppNotConfiguredError extends Error {}

function sessionDir(): string {
  return path.isAbsolute(env.WHATSAPP_SESSION_DIR)
    ? env.WHATSAPP_SESSION_DIR
    : path.join(process.cwd(), env.WHATSAPP_SESSION_DIR);
}

export interface WhatsAppConnection {
  sock: WASocket;
  /** Closes the socket without logging out — the session on disk stays
   * valid for the next run. Never call sock.logout() from job code: that
   * invalidates the paired device and forces a brand-new QR scan. */
  close: () => Promise<void>;
}

/**
 * Connects using the session scripts/whatsapp-pair.ts already created.
 * Throws WhatsAppNotConfiguredError if no session exists yet — never
 * silently starts a fresh pairing from unattended job code (that would
 * print a QR code nobody is watching and hang).
 *
 * `onSocketReady`, when given, runs on `sock` the instant it exists —
 * BEFORE this function awaits the handshake/"open" event. Found live,
 * 2026-11-18, debugging jobs/whatsapp-harvest.ts: a caller that waits for
 * connectWhatsApp() to return and only THEN calls `sock.ev.on("messages.
 * upsert", ...)` misses everything — baileys delivers/emits the queued
 * offline-message backlog during the handshake itself, not after. Five
 * consecutive real tests (fresh messages the owner sent seconds earlier)
 * all came back with zero events until this was fixed. Any caller that
 * needs to see incoming messages MUST register through this hook, never
 * by attaching to the returned `sock` afterward.
 */
export async function connectWhatsApp(
  timeoutMs = 30_000,
  onSocketReady?: (sock: WASocket) => void,
): Promise<WhatsAppConnection> {
  const fs = await import("node:fs");
  const dir = sessionDir();
  if (!fs.existsSync(path.join(dir, "creds.json"))) {
    throw new WhatsAppNotConfiguredError(
      `No WhatsApp session at ${dir} — run scripts/whatsapp-pair.ts once first.`,
    );
  }

  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } =
    await import("baileys");

  // baileys' own auth state loader, not a React hook — the "use" prefix is a naming coincidence.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const sock = makeWASocket({
    auth: state,
    logger: silentLogger,
    // Must match scripts/whatsapp-pair.ts's browser exactly — baileys'
    // getUserAgent() hardcodes the registration's userAgent.platform to
    // either ANDROID or WEB with no other option, and WEB is exactly
    // what WhatsApp has been rejecting since Feb 2026 (confirmed live,
    // 2026-11-16, via the owner's full debug log: registration failed
    // with "Connection Terminated" before a QR was ever shown).
    // Browsers.android is the only way to reach the ANDROID path.
    browser: Browsers.android("PreçoCaindo"),
    printQRInTerminal: false,
  });
  sock.ev.on("creds.update", saveCreds);
  onSocketReady?.(sock);

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`WhatsApp connection timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    sock.ev.on("connection.update", (update) => {
      if (update.connection === "open") {
        clearTimeout(timer);
        resolve();
      } else if (update.connection === "close") {
        clearTimeout(timer);
        const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          reject(
            new WhatsAppNotConfiguredError(
              "WhatsApp session was logged out (from the phone or by WhatsApp) — run scripts/whatsapp-pair.ts again.",
            ),
          );
        } else {
          reject(new Error(`WhatsApp connection closed before opening: ${String(update.lastDisconnect?.error)}`));
        }
      }
    });
  });

  logger.info("whatsapp.connected", { user: sock.user?.id });

  return {
    sock,
    close: async () => {
      sock.ev.removeAllListeners("connection.update");
      sock.end(undefined);
    },
  };
}
