// Libs
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';

expand(config({ quiet: true }));

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().min(1).default('api'),
  DATABASE_URL: z.url(),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),

  /** Signs the access token. Rotating it invalidates every access token still in flight. */
  JWT_SECRET: z.string().min(32),

  /** Mailpit in development and tests; a transactional provider in production. */
  SMTP_URL: z.url().default('smtp://localhost:1025'),
  MAIL_FROM: z.string().min(1).default('Harness <nao-responda@harness.local>'),

  /** Where the links inside e-mails point — the web app, not the API. */
  WEB_URL: z.url().default('http://localhost:3000'),

  /** Per IP, on the unauthenticated auth routes. Raised in tests, which hammer them. */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  AUTH_RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  /**
   * Per IP, on the two routes that write a shop. Its own pair rather than the auth one: those
   * numbers are sized for an anonymous stranger guessing a password, and a signed-in shopkeeper
   * saving the settings form five times in a minute is ordinary. What this bounds is the outbound
   * geocoding call each write can make, which waits on a third party for up to four seconds.
   */
  STORE_WRITE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  STORE_WRITE_RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  /**
   * Which addresses may claim a client IP through x-forwarded-for. Every browser call arrives
   * through the web app's route handlers, so without this the rate limit sees one address for
   * everyone. Accepts Fastify's syntax: `loopback`, a CIDR, a comma-separated list, or `false`.
   */
  TRUST_PROXY: z.string().default('loopback'),
});

/**
 * The only reader of `process.env` (gate `api/env-through-schema`). Parsed once, at import, so a
 * missing variable stops the boot with every problem listed — not on the first request that needs it.
 */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
export type Env = typeof env;
