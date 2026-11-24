// Amazon Creators API — teste de elegibilidade (só leitura, 1 chamada GetItems, BR).
// Lê AMAZON_CREATORS_CREDENTIAL_* e AMAZON_BR_ASSOCIATE_TAG do .env; nunca imprime token/secret.
// Uso: node scripts/amazon-creators-smoke.mjs
// 403 AssociateNotEligible = conta ainda sem as 10 vendas qualificadas em 30 dias (ver docs/AMAZON.md).
import { readFileSync } from "node:fs";
const env = {};
for (const l of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m) env[m[1]] = m[2];
}
const id = env.AMAZON_CREATORS_CREDENTIAL_ID, secret = env.AMAZON_CREATORS_CREDENTIAL_SECRET;
const tag = env.AMAZON_BR_ASSOCIATE_TAG;
console.log("tag:", tag, "| version:", env.AMAZON_CREATORS_CREDENTIAL_VERSION);

const tr = await fetch("https://api.amazon.com/auth/o2/token", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ grant_type: "client_credentials", client_id: id, client_secret: secret, scope: "creatorsapi::default" }),
});
const tj = await tr.json().catch(() => ({}));
console.log("token HTTP", tr.status, tj.access_token ? "OK expires_in=" + tj.expires_in : JSON.stringify({ error: tj.error, desc: tj.error_description }));
if (!tj.access_token) process.exit(1);

const r = await fetch("https://creatorsapi.amazon/catalog/v1/getItems", {
  method: "POST",
  headers: { Authorization: `Bearer ${tj.access_token}`, "Content-Type": "application/json", "x-marketplace": "www.amazon.com.br" },
  body: JSON.stringify({
    itemIds: ["B0CT62YYMR"], itemIdType: "ASIN", marketplace: "www.amazon.com.br", partnerTag: tag,
    resources: ["itemInfo.title", "images.primary.small", "offersV2.listings.price", "offersV2.listings.availability"],
  }),
});
const txt = await r.text();
console.log("getItems HTTP", r.status);
console.log(txt.slice(0, 1500));
