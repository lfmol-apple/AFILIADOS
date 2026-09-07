/**
 * Manual, human-run utility to refresh MERCADO_LIVRE_ACCESS_TOKEN before it
 * expires (~6h after OAuth issuance — confirmed live, see
 * docs/MONETIZATION_SCORE.md's "Automação" section). No automated refresh
 * job exists in jobs/ — this script IS the proposed minimal, safe solution:
 * a human runs it, never a cron (Mercado Livre's refresh_token is
 * single-use/rotating — every refresh issues a NEW refresh_token that
 * invalidates the old one, so this must write both values back
 * atomically or the pair goes stale together).
 *
 * Never prints the access_token/refresh_token/client_secret — same
 * discipline as the rest of this project's secret handling. Writes
 * directly to the local .env file; a production .env still needs the
 * same values copied over manually (or this script re-run there),
 * exactly like the initial OAuth setup did.
 *
 * Usage: npx tsx scripts/ml-refresh-token.ts
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { env } from "@/lib/config/env";

async function main() {
  if (!env.MERCADO_LIVRE_CLIENT_ID || !env.MERCADO_LIVRE_CLIENT_SECRET || !env.MERCADO_LIVRE_REFRESH_TOKEN) {
    console.error(
      "MERCADO_LIVRE_CLIENT_ID, MERCADO_LIVRE_CLIENT_SECRET and MERCADO_LIVRE_REFRESH_TOKEN must all be set in .env.",
    );
    process.exitCode = 1;
    return;
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: env.MERCADO_LIVRE_CLIENT_SECRET,
      refresh_token: env.MERCADO_LIVRE_REFRESH_TOKEN,
    }),
  });

  if (!response.ok) {
    // Deliberately not logging the body — token-exchange error responses
    // from Mercado Livre can echo back request parameters.
    console.error(`Refresh failed: HTTP ${response.status}. Check the app's DevCenter status.`);
    process.exitCode = 1;
    return;
  }

  const body = (await response.json()) as { access_token: string; refresh_token: string };

  const envPath = join(process.cwd(), ".env");
  let contents = readFileSync(envPath, "utf-8");
  contents = replaceOrAppendVar(contents, "MERCADO_LIVRE_ACCESS_TOKEN", body.access_token);
  contents = replaceOrAppendVar(contents, "MERCADO_LIVRE_REFRESH_TOKEN", body.refresh_token);
  writeFileSync(envPath, contents);

  console.log(
    "MERCADO_LIVRE_ACCESS_TOKEN and MERCADO_LIVRE_REFRESH_TOKEN refreshed and written to .env " +
      "(values not printed). Restart the app for it to pick up the new token.",
  );
}

function replaceOrAppendVar(contents: string, key: string, value: string): string {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(contents) ? contents.replace(pattern, line) : `${contents}\n${line}\n`;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
