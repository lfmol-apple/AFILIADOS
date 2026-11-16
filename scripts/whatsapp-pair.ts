import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { env } from "@/lib/config/env";

/**
 * One-time interactive setup for the WhatsApp Channel (owner's brief,
 * 2026-11-15, risk explicitly accepted — see lib/services/whatsapp-
 * connection.ts's doc comment). Run this once on the machine/server that
 * will send the daily digest:
 *
 *   npm run whatsapp:pair
 *
 * It prints a QR code — scan it with WhatsApp on the phone whose number
 * should run the channel (Configurações > Aparelhos conectados > Conectar
 * um aparelho). Once linked, it creates the Channel "Promoções PreçoCaindo"
 * and prints the jid to put in .env as WHATSAPP_CHANNEL_JID. The session
 * is saved under WHATSAPP_SESSION_DIR — back it up, never commit it, and
 * never delete it (that forces a brand-new QR scan and a brand-new
 * channel next time).
 */
const CHANNEL_NAME = "Promoções PreçoCaindo";
const CHANNEL_DESCRIPTION =
  "Produtos reais em alta no PreçoCaindo, todo dia — preço, histórico e onde comprar.";
const MAX_RECONNECTS = 5;

function sessionDir(): string {
  return path.isAbsolute(env.WHATSAPP_SESSION_DIR)
    ? env.WHATSAPP_SESSION_DIR
    : path.join(process.cwd(), env.WHATSAPP_SESSION_DIR);
}

let qrCount = 0;

/**
 * Confirmed live, 2026-11-16, straight from baileys' own README ("Summary
 * of Events on First Connection": "When you connect first time,
 * connection.update will be fired requesting you to restart sock"): the
 * socket closes ON PURPOSE right after a successful QR scan, and the
 * caller is expected to open a brand-new socket (reusing the now-updated
 * auth state saveCreds already wrote to disk) rather than treat that
 * close as a failure. Recurses until `open`, up to MAX_RECONNECTS times —
 * a real repeated failure (not the expected one-time restart) must still
 * surface as an error instead of looping forever.
 */
async function connectUntilOpen(
  dir: string,
  attempt = 1,
): Promise<import("baileys").WASocket> {
  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } =
    await import("baileys");
  // baileys' own auth state loader, not a React hook — the "use" prefix is a naming coincidence.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  // Second real root cause, found live 2026-11-16: `browser[1]` deciding
  // DeviceProps.PlatformType (DESKTOP vs the CHROME fallback) is a
  // DIFFERENT field than the one WhatsApp actually rejects — baileys'
  // own lib/Utils/validate-connection.js's getUserAgent() hardcodes
  // userAgent.platform to either ANDROID or WEB with NO other option
  // (`browser[1].includes('android') ? ANDROID : WEB`), and WEB is
  // exactly what's being rejected (the registration itself failed with
  // "Connection Terminated" before a QR was even shown, confirmed by the
  // owner's full debug log). Browsers.android (added to baileys mid-2026
  // specifically for this) is the only way to reach the ANDROID path —
  // this also moves DeviceProps.PlatformType to ANDROID_PHONE instead of
  // DESKTOP (lib/Utils/validate-connection.js's getPlatformType has a
  // special case for it), which only affects how the linked device shows
  // up in the phone's own device list, nothing functional.
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "debug" }),
    browser: Browsers.android("PreçoCaindo"),
  });
  sock.ev.on("creds.update", saveCreds);

  return new Promise((resolve, reject) => {
    sock.ev.on("connection.update", (update) => {
      console.log(
        "\n[connection.update]",
        JSON.stringify({ ...update, qr: update.qr ? `(len ${update.qr.length})` : undefined }),
      );
      // `printQRInTerminal` is a documented-but-deprecated no-op in this
      // baileys version — it only logs a deprecation warning through the
      // socket's own logger, so the QR was never drawn at all. Printing
      // it ourselves from the `qr` field is the fix the deprecation
      // warning itself asks for.
      if (update.qr) {
        qrCount += 1;
        console.log(`\nQR #${qrCount} — escaneie em WhatsApp > Aparelhos conectados > Conectar um aparelho:\n`);
        qrcodeTerminal.generate(update.qr, { small: true });
      }
      if (update.connection === "open") {
        resolve(sock);
        return;
      }
      if (update.connection === "close") {
        const statusCode = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          reject(new Error("WhatsApp deslogou a sessão — apague a pasta de sessão e pareie de novo."));
          return;
        }
        if (attempt >= MAX_RECONNECTS) {
          reject(new Error(`Conexão fechada repetidamente (${attempt}x): ${String(update.lastDisconnect?.error)}`));
          return;
        }
        console.log(`\nConexão fechada (esperado logo após escanear) — reconectando (tentativa ${attempt + 1})...\n`);
        sock.end(undefined);
        connectUntilOpen(dir, attempt + 1).then(resolve, reject);
      }
    });
  });
}

async function main() {
  const dir = sessionDir();
  const alreadyPaired = fs.existsSync(path.join(dir, "creds.json"));
  if (alreadyPaired) {
    console.log(
      `Já existe uma sessão em ${dir}. Se quiser parear de novo (número diferente), apague essa pasta primeiro.`,
    );
  }
  fs.mkdirSync(dir, { recursive: true });

  const sock = await connectUntilOpen(dir);
  console.log(`Conectado como ${sock.user?.id ?? "(desconhecido)"}.`);

  if (!env.WHATSAPP_CHANNEL_JID) {
    console.log(`Criando o canal "${CHANNEL_NAME}"...`);
    const channel = await sock.newsletterCreate(CHANNEL_NAME, CHANNEL_DESCRIPTION);
    console.log("");
    console.log("=== Canal criado ===");
    console.log(`Nome: ${channel.name}`);
    console.log(`Jid: ${channel.id}`);
    if (channel.invite) {
      console.log(`Link de convite: https://whatsapp.com/channel/${channel.invite}`);
    }
    console.log("");
    console.log(`Cole isto no .env de produção: WHATSAPP_CHANNEL_JID="${channel.id}"`);
  } else {
    console.log(`WHATSAPP_CHANNEL_JID já está configurado (${env.WHATSAPP_CHANNEL_JID}) — não criei um canal novo.`);
  }

  sock.end(undefined);
  process.exit(0);
}

main().catch((err) => {
  console.error("whatsapp-pair falhou:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
