import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import pino from "pino";
import qrcodeTerminal from "qrcode-terminal";
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
 * um aparelho). Once linked, it creates the Channel "PreçoCaindo Ofertas"
 * and prints the jid to put in .env as WHATSAPP_CHANNEL_JID. The session
 * is saved under WHATSAPP_SESSION_DIR — back it up, never commit it, and
 * never delete it (that forces a brand-new QR scan and a brand-new
 * channel next time).
 */
const CHANNEL_NAME = "PreçoCaindo Ofertas";
const CHANNEL_DESCRIPTION =
  "Produtos reais em alta no PreçoCaindo, todo dia — preço, histórico e onde comprar.";

function sessionDir(): string {
  return path.isAbsolute(env.WHATSAPP_SESSION_DIR)
    ? env.WHATSAPP_SESSION_DIR
    : path.join(process.cwd(), env.WHATSAPP_SESSION_DIR);
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
  const { default: makeWASocket, useMultiFileAuthState, Browsers } = await import("baileys");
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  // Verbose on purpose, temporarily (owner's phone keeps failing the scan
  // with a generic "check your connection" error, 2026-11-16, with no
  // obvious network problem on either side) — "silent" was hiding
  // whatever baileys itself is actually seeing when a scan attempt fails.
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "debug" }),
    browser: Browsers.ubuntu("PreçoCaindo"),
  });
  sock.ev.on("creds.update", saveCreds);

  let qrCount = 0;
  // `printQRInTerminal` is a documented-but-deprecated no-op in this
  // baileys version (confirmed live, 2026-11-15: it only logs a
  // deprecation warning through the socket's own logger — which this
  // script sets to silent — so the QR was never drawn at all, and the
  // owner's first pairing attempt ran out the clock with nothing to scan,
  // failing with "QR refs attempts ended"). Printing it ourselves from
  // the `qr` field is the fix the deprecation warning itself asks for.
  await new Promise<void>((resolve, reject) => {
    sock.ev.on("connection.update", (update) => {
      console.log("\n[connection.update]", JSON.stringify({ ...update, qr: update.qr ? `(len ${update.qr.length})` : undefined }));
      if (update.qr) {
        qrCount += 1;
        console.log(`\nQR #${qrCount} — escaneie em WhatsApp > Aparelhos conectados > Conectar um aparelho:\n`);
        qrcodeTerminal.generate(update.qr, { small: true });
      }
      if (update.connection === "open") resolve();
      if (update.connection === "close" && !update.qr) {
        reject(new Error(`Conexão fechada: ${String(update.lastDisconnect?.error)}`));
      }
    });
  });

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
