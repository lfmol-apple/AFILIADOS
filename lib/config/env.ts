import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false", ""])
  .default("false")
  .transform((v) => v === "true");

function booleanFromEnvDefault(defaultValue: boolean) {
  return z
    .enum(["true", "false", ""])
    .default(defaultValue ? "true" : "false")
    .transform((v) => v === "true");
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("PreçoCaindo"),

  AMAZON_PROVIDER: z.enum(["mock", "live"]).default("mock"),

  // DEPRECATED — kept only so an existing .env from before the
  // multi-marketplace config (see lib/config/marketplaces.ts) keeps
  // working. New code should never read this directly; it's folded into
  // AMAZON_BR_ASSOCIATE_TAG as a fallback if that's unset. Prefer setting
  // AMAZON_BR_ASSOCIATE_TAG explicitly.
  AMAZON_ASSOCIATE_TAG: z.string().default(""),

  // --- Amazon Brasil (amazon.com.br) — PETMOL, Store ID petmol-20 ---
  // PreçoCaindo's own Tracking ID under that account is precocaindo-20
  // (confirmed, already created — see docs/AMAZON.md). Whether the account
  // is *approved for the Creators API* is a separate, still-pending fact —
  // see AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED below.
  AMAZON_BR_ENABLED: booleanFromEnvDefault(true),
  AMAZON_BR_API_ENABLED: booleanFromEnvDefault(false),
  AMAZON_BR_ASSOCIATE_TAG: z.string().default(""),
  // Flip these only once a human has actually confirmed them with Amazon —
  // never infer from click/order counts in the affiliate panel (project
  // brief: "NÃO inferir que '13 pedidos' = '10 vendas qualificadas'").
  AMAZON_BR_CREATORS_API_ACCOUNT_APPROVED: booleanFromEnvDefault(false),
  AMAZON_BR_QUALIFIED_SALES_MET: booleanFromEnvDefault(false),

  // --- Amazon United States (amazon.com) — PETMOL, Associate ID
  // petmol07-20. That ID belongs to the petmol.com.br property, NOT
  // PreçoCaindo — precocaindo.com.br has not been registered on this
  // account yet, so AMAZON_US_ASSOCIATE_TAG stays empty and non-operational
  // until a human does that registration and sets it explicitly. Never
  // default this to petmol07-20. ---
  AMAZON_US_ENABLED: booleanFromEnvDefault(false),
  AMAZON_US_API_ENABLED: booleanFromEnvDefault(false),
  AMAZON_US_ASSOCIATE_TAG: z.string().default(""),
  AMAZON_US_PRECOCAINDO_REGISTERED: booleanFromEnvDefault(false),
  AMAZON_US_PAYMENT_CONFIGURED: booleanFromEnvDefault(false),

  // Shared Creators API endpoint placeholders. The real Creators API may
  // turn out to need per-marketplace host/region instead of a shared one —
  // these are deliberately left unconfirmed pending official docs (see
  // docs/AMAZON.md). Do not treat their presence as proof the API shape is
  // correct.
  AMAZON_CREATORS_API_KEY: z.string().default(""),
  AMAZON_CREATORS_API_SECRET: z.string().default(""),
  AMAZON_CREATORS_API_HOST: z.string().default(""),
  AMAZON_CREATORS_API_REGION: z.string().default("us-east-1"),
  AMAZON_CONTENT_TTL: z.coerce.number().int().positive().default(3600),
  AMAZON_ASSOCIATE_DISCLOSURE: z
    .string()
    .default("Como associado da Amazon, eu ganho com compras qualificadas."),
  AMAZON_POLICY_REVIEW_DATE: z.string().default("2026-08-17"),

  CONTENT_GENERATION: z
    .enum(["mock", "openai", "anthropic", "off"])
    .default("mock"),
  OPENAI_API_KEY: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),

  AUTO_PUBLISH: booleanFromEnv,
  PRICE_ALERTS: booleanFromEnv,
  PAID_MEDIA: booleanFromEnv,

  // Explicit pre-launch gate for the public catalog (/, /ofertas,
  // /produto, /categorias, /melhores, /comparar) — see
  // lib/config/public-catalog.ts. Defaults to false ("off") so a fresh
  // deploy never accidentally shows fictional prices before a human has
  // deliberately turned this on. Even when true, isPublicCatalogSafeToShow()
  // still forces it off in production if AMAZON_PROVIDER is "mock" — this
  // flag alone is not enough to publish mock prices to the internet.
  PUBLIC_CATALOG_ENABLED: booleanFromEnvDefault(false),

  // Independent gate for Product rows with dataSource=MANUAL_VERIFIED —
  // a small, hand-curated cohort whose facts a human entered and checked
  // directly, never fetched from AMAZON_PROVIDER. Deliberately decoupled
  // from PUBLIC_CATALOG_ENABLED/AMAZON_PROVIDER: a manually verified
  // product isn't "mock data" just because the provider mode is mock, so
  // it must not be blocked by the same switch that protects the
  // provider-sourced/demo catalog. dataSource=MOCK is NEVER made visible
  // by this flag — see lib/config/public-catalog.ts.
  MANUAL_PRODUCTS_ENABLED: booleanFromEnvDefault(false),

  // scrypt-hashed admin password ("scrypt:<saltHex>:<hashHex>"), generated
  // via `npm run admin:hash-password` — never the plaintext password.
  // Replaces the old ADMIN_ACCESS_TOKEN shared-secret-in-the-URL scheme
  // (compared via `===`, visible in browser history/referrers/server
  // logs), which was never real authentication. See lib/admin/auth.ts and
  // docs/PRODUCTION_READINESS.md.
  ADMIN_PASSWORD_HASH: z.string().default(""),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration:\n${parsed.error.issues
        .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
        .join("\n")}`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
