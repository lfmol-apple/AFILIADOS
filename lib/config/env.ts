import { z } from "zod";

const booleanFromEnv = z
  .enum(["true", "false", ""])
  .default("false")
  .transform((v) => v === "true");

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("PreçoCaindo"),

  AMAZON_PROVIDER: z.enum(["mock", "live"]).default("mock"),
  AMAZON_ASSOCIATE_TAG: z.string().default(""),
  AMAZON_CREATORS_API_KEY: z.string().default(""),
  AMAZON_CREATORS_API_SECRET: z.string().default(""),
  AMAZON_CREATORS_API_HOST: z.string().default(""),
  AMAZON_CREATORS_API_REGION: z.string().default("us-east-1"),
  AMAZON_CONTENT_TTL: z.coerce.number().int().positive().default(3600),
  AMAZON_ASSOCIATE_DISCLOSURE: z
    .string()
    .default("Como associado da Amazon, eu ganho com compras qualificadas."),
  AMAZON_POLICY_REVIEW_DATE: z.string().default("2026-08-17"),

  CONTENT_GENERATION: z.enum(["mock", "openai", "anthropic", "off"]).default("mock"),
  OPENAI_API_KEY: z.string().default(""),
  ANTHROPIC_API_KEY: z.string().default(""),

  AUTO_PUBLISH: booleanFromEnv,
  PRICE_ALERTS: booleanFromEnv,
  PAID_MEDIA: booleanFromEnv,

  ADMIN_ACCESS_TOKEN: z.string().default(""),
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
