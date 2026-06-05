import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment loading + validation.
//
// tsx/node do not auto-load `.env`, so we load it explicitly (checking the repo
// root and the server dir), then validate the result with zod. JWT_SECRET is
// required and the process refuses to start without it. AI_* vars are optional
// here so the server can boot without AI configured; the AI service validates
// and reports them lazily on first use. Import this module for its side effects
// (load + validate) and/or for the typed `config` export.
// ---------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  process.env.ENV_FILE,
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '.env'),
].filter((p): p is string => Boolean(p));

for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    process.loadEnvFile(candidate);
    break;
  }
}

const EnvSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  // Auth — required. Min length keeps weak secrets out.
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  // Storage / static asset locations (optional; sensible defaults at runtime).
  DATA_DIR: z.string().optional(),
  STATIC_DIR: z.string().optional(),

  // AI provider config — optional at boot, validated lazily by the AI service.
  AI_PROVIDER: z
    .enum(['openai-compatible', 'azure', 'anthropic', 'google'])
    .default('openai-compatible'),
  AI_API_KEY: z.string().optional(),
  AI_BASE_URL: z.string().optional(),
  AI_MODEL: z.string().optional(),
  AI_API_VERSION: z.string().optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

function loadConfig(): AppConfig {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('\n');
    console.error(
      `FATAL: invalid environment configuration. See .env.example.\n${details}`
    );
    process.exit(1);
  }
  return result.data;
}

export const config: AppConfig = loadConfig();
