import { z } from 'zod';

// docs/04 §7 — environment validated at startup; the server refuses to boot if something is missing.
const ConfigSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().min(0).max(65535).default(2567),
  CORS_ORIGIN: z.string().min(1),
  INVITE_CODES: z.string().default(''),
  SENTRY_DSN: z.string().default(''),
  /** SRV-03 — delay between AI actions so the client can follow (0 in tests). */
  AI_ACTION_DELAY_MS: z.coerce.number().int().min(0).default(400),
  /** SRV-04 — simple per-IP limit for POST /auth/redeem. */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1).default(60_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Config = z.infer<typeof ConfigSchema>;

export class ConfigError extends Error {}

export function loadConfig(env: Readonly<Record<string, string | undefined>>): Config {
  // Empty strings count as missing for required variables.
  const cleaned = Object.fromEntries(
    Object.entries(env).filter(([, v]) => v !== undefined && v !== ''),
  );
  const result = ConfigSchema.safeParse(cleaned);
  if (result.success) return result.data;
  const problems = result.error.issues.map((i) => `${i.path.join('.') || '(env)'}: ${i.message}`);
  throw new ConfigError(`Invalid environment:\n  ${problems.join('\n  ')}`);
}
