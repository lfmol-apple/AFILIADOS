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

  // Web Push for the owner-only "site was accessed" alert (lib/push/send.ts).
  // The public key is also read directly as process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  // from client components — Next only inlines a NEXT_PUBLIC_ var into the
  // browser bundle from a literal reference, never through this module
  // (which also validates DATABASE_URL and other server-only secrets, so it
  // must never be imported by a "use client" file).
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().default(""),
  VAPID_PRIVATE_KEY: z.string().default(""),
  VAPID_SUBJECT: z.string().default("mailto:contato@precocaindo.com.br"),

  AMAZON_PROVIDER: z.enum(["mock", "live"]).default("mock"),

  // Which marketplace the public site renders. Defaults to BR for the
  // existing production behavior; set PUBLIC_MARKETPLACE=US only when the
  // US Associate account, tracking tag, and product source are ready.
  PUBLIC_MARKETPLACE: z
    .enum(["BR", "US", ""])
    .default("BR")
    .transform((v) => (v === "" ? "BR" : v)),

  // DEPRECATED — kept only so an existing .env from before the
  // multi-marketplace config (see lib/config/marketplaces.ts) keeps
  // working. New code should never read this directly, and the current
  // Amazon application deliberately does not use it as a fallback. Prefer
  // setting AMAZON_BR_ASSOCIATE_TAG explicitly after human confirmation.
  AMAZON_ASSOCIATE_TAG: z.string().default(""),

  // --- Amazon Brasil (amazon.com.br) ---
  // petmol-20 is historical/PETMOL-only, never used here (see
  // FORBIDDEN_HISTORICAL_TAGS in lib/config/marketplaces.ts, which actively
  // refuses it even if someone sets it by mistake). Older project notes
  // mentioned precocaindo-20 as a guess — that was wrong. The account owner
  // confirmed the real, current Store ID directly in Associates Central
  // ("Vincular lojas"): precocaindo0c-20. This schema default stays empty on
  // purpose — a human must still set AMAZON_BR_ASSOCIATE_TAG explicitly in
  // each real .env (local/production), never inferred here.
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
    .default(
      "Como participante do Programa de Associados da Amazon, sou remunerado pelas compras qualificadas efetuadas.",
    ),
  AMAZON_POLICY_REVIEW_DATE: z.string().default("2026-08-17"),

  // --- Mercado Livre (lib/providers/mercado-livre-provider.ts) ---
  // Real, confirmed endpoints (2026-09-07 research — see
  // docs/MONETIZATION_SCORE.md): GET /items/{id}, GET /trends/{site_id}
  // [/{category_id}], GET /highlights/{site_id}/category/{category_id}.
  // Empirically confirmed these all require Authorization: Bearer — even
  // historically-public endpoints like /sites now return 403
  // PA_UNAUTHORIZED_RESULT_FROM_POLICIES without one. Obtaining a token
  // requires registering an application in Mercado Livre's DevCenter
  // (Client ID + Secret) and completing their OAuth flow — a human step
  // outside this codebase. MERCADO_LIVRE_ACCESS_TOKEN stays empty by
  // default; every provider/demand-source method fails explicitly and
  // loudly until a human supplies a real token, exactly like AmazonProvider
  // does for AMAZON_BR_API_ENABLED.
  MERCADO_LIVRE_ENABLED: booleanFromEnvDefault(false),
  MERCADO_LIVRE_API_ENABLED: booleanFromEnvDefault(false),
  MERCADO_LIVRE_SITE_ID: z.string().default("MLB"),
  MERCADO_LIVRE_ACCESS_TOKEN: z.string().default(""),
  // Only used by scripts/ml-refresh-token.ts (a manual, human-run utility
  // — never called by the app itself). MERCADO_LIVRE_ACCESS_TOKEN expires
  // ~6h after OAuth issuance; no automated refresh job exists yet (see
  // docs/MONETIZATION_SCORE.md's "Automação" section for the operational
  // risk this represents and why it wasn't built into jobs/ this phase).
  MERCADO_LIVRE_CLIENT_ID: z.string().default(""),
  MERCADO_LIVRE_CLIENT_SECRET: z.string().default(""),
  MERCADO_LIVRE_REFRESH_TOKEN: z.string().default(""),

  // --- Shopee Affiliate API (lib/providers/shopee-provider.ts) ---
  // Corrected 2026-09-07: earlier research looked at Shopee Open Platform
  // (seller/ERP API), the wrong product. The account this project actually
  // has access to is the Shopee AFFILIATE API — a separate GraphQL API at
  // open-api.affiliate.shopee.com.br, authenticated with an App ID +
  // Secret Key (found on the Shopee Affiliate homepage under "Open API"),
  // not a Partner ID/Key. See docs/AFFILIATE_LINK_REGISTRY.md for the full
  // research trail (endpoint, signature formula, confirmed fields) — sourced
  // from third-party technical documentation of the official API, not
  // browsed directly against this account's own docs, so verify against
  // the account's Playground before relying on it for real money.
  SHOPEE_AFFILIATE_ENABLED: booleanFromEnvDefault(false),
  SHOPEE_AFFILIATE_API_ENABLED: booleanFromEnvDefault(false),
  SHOPEE_APP_ID: z.string().default(""),
  SHOPEE_SECRET_KEY: z.string().default(""),
  // sub_id1 on every link PreçoCaindo generates — how Shopee-side revenue
  // is distinguished from any other project sharing this same affiliate
  // account. Alphanumeric only (Shopee's sub_id constraint) — see
  // lib/services/shopee-attribution.ts.
  SHOPEE_SUB_ID1: z.string().default("precocaindo"),

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

  // Shared secret for the internal maintenance endpoint the VPS cron calls
  // (app/api/internal/seo-maintenance). Empty = endpoint disabled (404).
  CRON_SECRET: z.string().default(""),

  // --- Daily performance email (jobs/daily-performance-digest.ts) ---
  // Sent through Resend's HTTP API (lib/services/email-sender.ts). Empty
  // RESEND_API_KEY or recipient means "not configured": the job refuses to
  // send instead of guessing. Never commit a real key — production .env only.
  RESEND_API_KEY: z.string().default(""),
  DAILY_DIGEST_EMAIL_TO: z.string().default(""),
  // e.g. "PreçoCaindo <relatorios@precocaindo.com.br>" once the domain is
  // verified at Resend; onboarding@resend.dev only delivers to the account owner.
  DAILY_DIGEST_EMAIL_FROM: z
    .string()
    .default("PreçoCaindo <onboarding@resend.dev>"),

  // --- Telegram price-drop digest (jobs/telegram-digest.ts) ---
  // Sent through Telegram's Bot HTTP API (lib/services/telegram-sender.ts).
  // Empty TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID means "not configured":
  // the job refuses to send instead of guessing, same convention as the
  // email digest above. Never commit a real token — production .env only.
  // TELEGRAM_CHANNEL_ID is the channel's public @username (with the @) or,
  // for a private channel, its numeric chat id.
  TELEGRAM_BOT_TOKEN: z.string().default(""),
  TELEGRAM_CHANNEL_ID: z.string().default(""),

  // --- WhatsApp Channel daily digest (jobs/whatsapp-digest.ts) ---
  // Unofficial (no API Meta grants for this) — lib/services/whatsapp-
  // connection.ts holds a real linked-device session via baileys, paired
  // once with scripts/whatsapp-pair.ts. WHATSAPP_SESSION_DIR must point at
  // a bind-mounted host directory in production — session credentials are
  // private keys, never baked into the image or committed (see .gitignore).
  //
  // WHATSAPP_CHANNEL_JID: the public Channel ("Mercado Livre, Shopee e Amazon").
  // Confirmed 2026-11-15 (GitHub issue WhiskeySockets/Baileys#2687, and the
  // same "accepted but never delivered" symptom independently in
  // whatsapp-web.js/WAHA) that NO automated client can reliably post to a
  // WhatsApp Channel today — not a config issue here, a protocol-level
  // block. So this JID is never sent to automatically; it exists only so
  // jobs/whatsapp-digest.ts can build the day's ready-to-forward DM to
  // WHATSAPP_OWNER_PERSONAL_JID (owner forwards each message into the
  // Channel by hand — the one path that actually works, since it's the
  // real app sending).
  //
  // WHATSAPP_GROUP_JID: the actual automated destination — a WhatsApp
  // Group in "announcement" (only-admin-posts) mode, created 2026-11-15
  // specifically because group sends use baileys' normal, reliable relay
  // path (unlike newsletters). Trade-off accepted by the owner: group
  // members' phone numbers are visible to each other, unlike a Channel's
  // anonymous followers.
  //
  // WHATSAPP_OWNER_PERSONAL_JID: the owner's own personal WhatsApp number
  // (format "<digits>@s.whatsapp.net"), used only as the target for the
  // daily forward-ready DM described above. Empty means that DM is skipped.
  WHATSAPP_CHANNEL_JID: z.string().default(""),
  WHATSAPP_GROUP_JID: z.string().default(""),
  WHATSAPP_OWNER_PERSONAL_JID: z.string().default(""),
  WHATSAPP_SESSION_DIR: z.string().default("data/whatsapp-session"),

  // WHATSAPP_CHANNEL_INVITE_URL: the public, clickable "follow this
  // Channel" link (format https://whatsapp.com/channel/<id>) — a
  // DIFFERENT thing than WHATSAPP_CHANNEL_JID above (that's the internal
  // protocol address, never shown to a visitor). Used only by /canal
  // (app/canal/page.tsx), the Meta Ads landing page for channel growth.
  // Empty means the page shows "link indisponível" instead of a dead
  // button — same fail-closed pattern as AmazonShowcaseCard's href.
  WHATSAPP_CHANNEL_INVITE_URL: z.string().default(""),

  // PRODUCT_IMAGE_DIR: where lib/services/product-image-store.ts saves a
  // real, directly-observed product photo (WhatsApp's own link-preview
  // thumbnail — see that file's doc comment) when no marketplace-hosted
  // image URL exists to hotlink, e.g. a manually-registered Amazon
  // product (lib/services/manual-product-registration.ts deliberately
  // has no image input, same no-fabrication rule). Bind-mounted in
  // production (docker-compose.prod.yml) so it survives every rebuild,
  // same pattern as WHATSAPP_SESSION_DIR above.
  PRODUCT_IMAGE_DIR: z.string().default("data/product-images"),

  // Vitrine Inteligente (see app/catalogo/mercado-livre.xml/route.ts and
  // docs/VITRINE_INTELIGENTE.md). VITRINE_CAPACITY / _MAX_DAILY_REPLACEMENTS
  // are read directly via process.env in jobs/vitrine-renew.ts (no
  // validation needed for a plain optional integer knob), listed here only
  // so every Vitrine env var is discoverable in one place.
  //
  // VITRINE_CATALOG_LINK_MODE: "redirect" (default) makes the Meta catalog
  // feed's `link` point straight at /go/vitrine/... — one click, zero
  // intermediate page, but genuinely unconfirmed whether Meta's catalog
  // crawler accepts a redirect off its verified domain (checked via web
  // research 2026-11-19: Meta's own docs don't say either way; Google
  // Merchant Center, the closest documented analog, explicitly rejects
  // this pattern). Henrique can flip this to "product_page" with NO code
  // change the moment Commerce Manager's Diagnostics tab flags an item —
  // that mode is unambiguously compliant (crawled and landed domain are
  // identical) at the cost of one extra click through /produto/[slug].
  VITRINE_CATALOG_LINK_MODE: z
    .enum(["redirect", "product_page"])
    .default("redirect"),

  // Meta Marketing API — real ad-spend import (jobs/vitrine-meta-spend-
  // sync.ts), confirmed feasible via research 2026-11-19: a System User
  // long-lived token scoped to Henrique's OWN ad account needs only
  // Standard access (ads_read) — no App Review, since this never acts on
  // another business's account. Empty = feature disabled, falls back to
  // the manual form (app/admin/vitrine-financeiro). Never a secret
  // default — Henrique must actually provide these once the ad account
  // exists.
  META_ACCESS_TOKEN: z.string().default(""),
  META_AD_ACCOUNT_ID: z.string().default(""),
  /// Scopes the Insights pull to just the Vitrine's own campaign, once it
  /// exists — without it, the sync would need to be pointed at a
  /// specific campaign manually before enabling.
  META_VITRINE_CAMPAIGN_ID: z.string().default(""),

  /// Meta Pixel (owner's authorization, 2026-11-22, "Frente B — Pixel
  /// Meta do Henrique"; adapted 2026-11-22 for "Gerenciador de Vitrines
  /// Inteligentes" Etapa 5): the numeric Pixel id Henrique provides from
  /// his own Meta Events Manager — NEVER invented or guessed. Empty (the
  /// default) means the pixel script is never loaded at all, same
  /// fail-closed convention as every other optional integration in this
  /// file. ONE id, mounted once (app/layout.tsx), covers every Vitrine —
  /// there is no per-vitrine Pixel configuration. The base script itself
  /// loads site-wide (components/meta-pixel.tsx), same as any ordinary
  /// Meta Pixel install; the e-commerce-style ViewContent/
  /// AffiliateOutboundClick events (lib/analytics/meta-pixel-client.ts)
  /// are the part scoped to a Vitrine's own featured product.
  META_PIXEL_ID: z.string().default(""),

  // Fábrica Inteligente de Criativos (owner's authorization, 2026-11-19)
  // — reuses the SAME OPENAI_API_KEY already declared above for content
  // generation (one OpenAI account/billing covers both chat and image
  // APIs; never a second, duplicate key field). Real per-image cost
  // confirmed via OpenAI's own docs, 2026-11-19 (gpt-image-2,
  // 1024x1536/1536x1024): low $0.005, medium $0.041-0.053, high
  // $0.165-0.211.
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  /// "low" | "medium" | "high" | "auto" — owner's explicit rule: never
  /// regenerate at a higher tier than configured without a human
  /// decision. "medium" is the default production tier (real cost
  /// ~$0.04-0.05/image) — a deliberate choice, not the API's own default
  /// ("auto"), so cost stays predictable.
  VITRINE_CREATIVE_QUALITY: z.enum(["low", "medium", "high", "auto"]).default("medium"),
  /// Real incident, 2026-11-20: a "isolated environment" test ran the
  /// full Vitrine cycle against an empty test database, whose spend
  /// ledger naturally read "$0 spent today" and silently let the SAME
  /// real OpenAI key make US$1.45 of real, uncontrolled paid calls — a
  /// DB-only budget check can never be a real safety boundary, because
  /// the key itself is shared with production regardless of which
  /// database answers `checkCreativeBudget()`. This is now a SEPARATE,
  /// mandatory gate enforced inside generateCreativeBase() itself (the
  /// one real place that calls the paid endpoint — never only in a
  /// caller, cron wrapper, or job), so no script can ever bypass it by
  /// pointing at a different database:
  ///   "teste" (the default when the var is unset — an explicitly set
  ///     value outside this enum fails env validation at startup
  ///     instead, which is fail-closed too, just differently): BLOCKS
  ///     every paid call unconditionally, before any network request is
  ///     built. This is the only safe default for any non-production
  ///     environment.
  ///   "piloto_autorizado": allows real calls, but hard-capped by
  ///     VITRINE_CREATIVE_PILOT_MAX_CALLS for this process's lifetime —
  ///     for a human-authorized, explicitly bounded single test.
  ///   "producao": the real, continuous operation — generateCreativeBase
  ///     itself also re-checks the real DB budget (checkCreativeBudget)
  ///     as defense-in-depth, even though callers already check it too.
  VITRINE_CREATIVE_MODE: z.enum(["teste", "piloto_autorizado", "producao"]).default("teste"),
  /// Required (and enforced) only in "piloto_autorizado" mode — see
  /// above. Defaults to 0, i.e. a missing value blocks every call just
  /// like "teste" mode would, rather than silently defaulting open.
  VITRINE_CREATIVE_PILOT_MAX_CALLS: z.coerce.number().int().nonnegative().default(0),
  /// Hard ceilings — owner's explicit rule: "não comprometa despesas...
  /// sem minha autorização financeira" + "implemente limites
  /// configuráveis de gasto." The job REFUSES to call the API once
  /// either is reached for the current day/month (real spend, from
  /// VitrineCreativeSpend — never estimated).
  VITRINE_CREATIVE_DAILY_BUDGET_USD: z.coerce.number().positive().default(2),
  VITRINE_CREATIVE_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(20),
  /// AI Commercial Analyst (owner's authorization, 2026-11-22, "Motor de
  /// Inteligência Comercial com IA", section 6: "limites configuráveis
  /// de consumo... bloqueio de chamadas acima do orçamento"). A SEPARATE
  /// ledger/ceiling from the creative budget above — text evaluation of
  /// candidates (gpt-4o-mini, a few cents per 1k candidates), never image
  /// generation. Deliberately small defaults — this is a new, unproven
  /// cost center.
  VITRINE_ANALYST_DAILY_BUDGET_USD: z.coerce.number().positive().default(1),
  VITRINE_ANALYST_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(10),
  /// Of the real candidates that pass every objective gate (same pool
  /// buildCommercialCandidatePool already produces), how many may be sent
  /// to the AI per run — a second, request-shaped ceiling on top of the
  /// dollar budget, so a single run can never silently consume the whole
  /// monthly budget at once.
  VITRINE_ANALYST_MAX_CANDIDATES_PER_RUN: z.coerce.number().int().positive().default(60),
  /// Same bind-mount pattern as PRODUCT_IMAGE_DIR above — a rebuild must
  /// never lose a generated creative (real money was spent on it).
  VITRINE_CREATIVE_DIR: z.string().default("data/vitrine-creatives"),
  /// One-shot `ad_overlay` mechanism (owner's directive, 2026-11-21:
  /// "o pilot-result-3 é nossa referência oficial"): a real, already-
  /// approved Henrique art used as a loose STRUCTURAL style anchor (see
  /// one-shot-ad-generator.ts's doc comment) — never copied literally,
  /// only its typography/icon/layout quality.
  ///
  /// Real root cause fixed, 2026-11-21 (PR #17 review, "referência visual
  /// no deploy"): this used to default to a path INSIDE the app source
  /// tree (lib/services/ai-creative-factory/assets/) — correctly
  /// gitignored (the real art is never committed), but that also means
  /// it lived in the image's own writable layer, not a volume, so a
  /// routine `docker compose build` would silently lose it on the next
  /// deploy with no warning before a real paid call tried to use it.
  /// Moved to the SAME host-bind-mount pattern already proven for
  /// VITRINE_CREATIVE_DIR/PRODUCT_IMAGE_DIR just above (see
  /// docker-compose.prod.yml's `./data/vitrine-creative-reference` mount
  /// and docs/DEPLOYMENT.md's one-time provisioning step) — a real
  /// rebuild can never lose this file again. Missing file →
  /// OneShotReferenceMissingError, a hard stop, never a silent fallback
  /// to the old compositor (owner's explicit rule, unchanged by this fix).
  VITRINE_HENRIQUE_STYLE_REFERENCE_PATH: z.string().default("data/vitrine-creative-reference/henrique-style-reference.png"),
  /// Owner's directive, 2026-11-21 ("não permita que a simples mudança de
  /// mecanismo provoque automaticamente 30 gerações pagas... migração
  /// progressiva, começando com um único produto autorizado"): a SEPARATE
  /// gate from VITRINE_CREATIVE_MODE — that one controls whether ANY paid
  /// call is allowed at all; this one controls WHICH specific real
  /// products may use the one-shot mechanism (new or migrating from the
  /// old hybrid compositor), independent of mode. Comma-separated real
  /// Mercado Livre externalIds (e.g. "MLB36520675"). Empty (the default)
  /// blocks every product — fail closed, same direction as every other
  /// gate in this file.
  VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST: z.string().default(""),
  /// Hard ceiling on how many one-shot generations (new or migrating) a
  /// SINGLE process run may make — independent of, and in addition to,
  /// the dollar-based VITRINE_CREATIVE_DAILY_BUDGET_USD/MONTHLY ceiling.
  /// Defaults to 0: a missing value blocks every migration, never
  /// silently allows one.
  VITRINE_ONE_SHOT_MIGRATION_MAX_CALLS: z.coerce.number().int().nonnegative().default(0),
  /// Owner's directive, 2026-11-21 ("não regenere automaticamente uma
  /// imagem a cada pequena alteração de preço... proponha uma política
  /// que considere frequência"): price-staleness still unpublishes a
  /// wrong-priced ad_overlay IMMEDIATELY and unconditionally (safety is
  /// never throttled) — but a real, paid regeneration attempt for a
  /// price-only trigger is rate-limited to once per this many hours per
  /// product, so a product whose price moves several times a day doesn't
  /// burn a real paid call on every single cycle while it's still
  /// settling. Does NOT apply to a migration (mechanism change) or a
  /// rejected/category/event-driven regeneration — those are already
  /// deliberate, one-time events, never a repeating price chase.
  VITRINE_PRICE_REGENERATION_MIN_INTERVAL_HOURS: z.coerce.number().positive().default(24),
  /// Owner's directive, 2026-11-24 ("implemente um limite de tentativas e
  /// um período de espera para impedir que o mesmo criativo reprovado
  /// consuma dinheiro repetidamente"): real incident this closes — a run
  /// of jobs/vitrine-creative-factory.ts retried a rejected ad_overlay
  /// unconditionally every single cycle, forever, with no limit. Once
  /// this many CONSECUTIVE rejected attempts have piled up for the same
  /// (merchantListingId, kind), auto-retry stops until
  /// VITRINE_CREATIVE_REJECTION_COOLDOWN_HOURS has passed since the last
  /// attempt — surfaced as "needs manual review" rather than silently
  /// retried. A single approved attempt resets the streak.
  VITRINE_CREATIVE_REJECTION_MAX_CONSECUTIVE: z.coerce.number().int().positive().default(2),
  /// Paired with VITRINE_CREATIVE_REJECTION_MAX_CONSECUTIVE above — once
  /// the streak limit is hit, how long to wait before trying again. Same
  /// order of magnitude as VITRINE_PRICE_REGENERATION_MIN_INTERVAL_HOURS
  /// (this project's existing debounce convention), not a new policy.
  VITRINE_CREATIVE_REJECTION_COOLDOWN_HOURS: z.coerce.number().positive().default(24),
  /// Owner's directive, 2026-11-24 ("solicitação manual explícita" as one
  /// of the only legitimate reasons to force a regeneration): comma-
  /// separated real merchantListingIds that bypass every skip/cooldown
  /// check below and always regenerate on the next run, regardless of
  /// approved/valid state — the explicit manual override, same
  /// allowlist-of-real-ids shape as VITRINE_ONE_SHOT_MIGRATION_ALLOWLIST.
  /// Empty (the default) forces nothing — fail closed.
  VITRINE_CREATIVE_FORCE_REGENERATE_IDS: z.string().default(""),
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
