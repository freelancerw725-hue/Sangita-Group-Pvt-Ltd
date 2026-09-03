import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_URL: z.string().url().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
  GOOGLE_CLIENT_EMAIL: z
    .string()
    .email("GOOGLE_CLIENT_EMAIL must be a valid service account email.")
    .optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url().optional(),
  GMAIL_FROM_ADDRESS: z.string().email().default("hello@swiftgrowthdigital.com"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-1.0"),
  GOOGLE_DRIVE_FOLDER_ID: z.string().optional(),
  DEMO_1_LINK: z.string().url().optional(),
  DEMO_2_LINK: z.string().url().optional(),
  PORTFOLIO_PDF_LINK: z.string().url().optional(),
});

type Env = z.infer<typeof envSchema>;
let cachedEnv: Env | null = null;

function getRawEnv(): Record<string, string | undefined> {
  return {
    ...process.env,
  };
}

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  cachedEnv = envSchema.parse(getRawEnv());
  return cachedEnv;
}

export function isGmailEnabled(): boolean {
  const env = getEnv();
  return Boolean(
    env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

export function isGeminiEnabled(): boolean {
  return Boolean(getEnv().GEMINI_API_KEY);
}

export function requireEnvValue<K extends keyof Env>(
  key: K,
  message?: string,
): NonNullable<Env[K]> {
  const value = getEnv()[key];
  if (typeof value === "string" && value.trim()) return value as NonNullable<Env[K]>;
  if (value) return value as NonNullable<Env[K]>;
  throw new Error(message ?? `${String(key)} is required.`);
}
