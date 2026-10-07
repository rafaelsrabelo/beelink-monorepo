// Libs
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';

expand(config({ quiet: true }));

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** An optional variable left as `NAME=` in a copied `.env` is absent, not an empty value to refuse. */
const blankAsAbsent = <Schema extends z.ZodType>(schema: Schema) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

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
  MAIL_FROM: z.string().min(1).default('bee-link <nao-responda@bee-link.local>'),

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
   * Per IP, on the route a signed-in shopper places an order through. A person orders a handful of
   * times; a script with one valid account would otherwise fill a shop's panel.
   */
  CUSTOMER_ORDER_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CUSTOMER_ORDER_RATE_LIMIT_WINDOW: z.string().default('10 minutes'),

  /**
   * Per IP, on the route a signed-in shopper prices their cart through — the one route that says
   * whether a coupon's code exists. A checkout prices again at every change, a handful of times; a
   * script with one valid account would otherwise guess a shop's codes.
   */
  CUSTOMER_QUOTE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  CUSTOMER_QUOTE_RATE_LIMIT_WINDOW: z.string().default('5 minutes'),

  /**
   * Per IP, on the route a shopper writes to the shop through, about an order. A person types a few
   * lines a minute; a script with one valid account would otherwise flood a shop's conversations.
   */
  CUSTOMER_MESSAGE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  CUSTOMER_MESSAGE_RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  /**
   * Which addresses may claim a client IP through x-forwarded-for. Every browser call arrives
   * through the web app's route handlers, so without this the rate limit sees one address for
   * everyone. Accepts Fastify's syntax: `loopback`, a CIDR, a comma-separated list, or `false`.
   */
  /**
   * Cloudinary, for the image uploads. Optional as a group: an API without them serves everything
   * else and refuses uploads with UPLOAD_NOT_CONFIGURED, which is a state worth being able to run
   * in — a reviewer's preview needs no storage account.
   *
   * All three or none is enforced where they are read. Half a configuration is a deployment that
   * looks switched on and fails at the first file.
   */
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  /** Where the files land inside the account, so one Cloudinary can serve more than this product. */
  CLOUDINARY_FOLDER: z.string().min(1).default('bee-link'),

  /**
   * MapTiler, for the panel's address box and the map beside it. Optional: without it the address
   * is typed by hand and the map is not drawn, which is a state worth being able to run in.
   *
   * Server-side only. The geocoding call is billable, so it goes out from here where a bearer
   * token is actually verified — a search proxy behind nothing but a cookie is a free geocoder
   * spending this account's quota.
   */
  MAPTILER_API_KEY: z.string().min(1).optional(),

  /** Uploads cost money and bandwidth, so they are limited harder than an ordinary write. */
  /** Typing produces requests: this is the limit that protects a billable key. */
  ADDRESS_SEARCH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  ADDRESS_SEARCH_RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  UPLOAD_RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  /**
   * Per IP, on the one anonymous write in the product: a visitor sending a site's contact form.
   * Sized for a person who mistypes and tries again, not for a robot — the trap handles the robot.
   */
  LEAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  LEAD_RATE_LIMIT_WINDOW: z.string().default('10 minutes'),

  /**
   * Per IP, on POST /stores/:slug/funnel-events — the shop window counting a step of its funnel
   * (BEELINK-276). Generous on purpose: a mobile carrier puts many visitors behind one address, and
   * a count refused is a visit missing from a shopkeeper's numbers, not an error anyone sees. It
   * bounds a script inflating one shop's counters.
   */
  FUNNEL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  FUNNEL_RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  TRUST_PROXY: z.string().default('loopback'),

  /**
   * Google, for "Continuar com Google" at a shop (G5). Optional as a group: without them the shop
   * window shows no Google button and the API refuses its routes with GOOGLE_SIGN_IN_UNAVAILABLE.
   *
   * `GOOGLE_REDIRECT_URI` is the one fixed address Google sends every shop's shopper back to — the
   * web's `/api/customer/google/callback` — registered once in the Google console, not per shop.
   */
  GOOGLE_CLIENT_ID: blankAsAbsent(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: blankAsAbsent(z.string().min(1)),
  GOOGLE_REDIRECT_URI: blankAsAbsent(z.url()),

  /**
   * Melhor Envio (BEELINK-182): bee-link's one app there, which each shop authorizes on its own
   * account. Optional as a group: without it the panel says shipping by carrier is not set up here and
   * the API refuses its routes with INTEGRATION_UNAVAILABLE.
   *
   * `MELHOR_ENVIO_REDIRECT_URI` is the web's `/api/integrations/melhor-envio/callback`, registered once
   * in the app, for every shop. `MELHOR_ENVIO_CONTACT_EMAIL` goes in the User-Agent, which Melhor
   * Envio refuses a request without.
   */
  MELHOR_ENVIO_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  MELHOR_ENVIO_CLIENT_ID: blankAsAbsent(z.string().min(1)),
  MELHOR_ENVIO_CLIENT_SECRET: blankAsAbsent(z.string().min(1)),
  MELHOR_ENVIO_REDIRECT_URI: blankAsAbsent(z.url()),
  MELHOR_ENVIO_CONTACT_EMAIL: z.email().default('contato@beecoders.net'),

  /**
   * Asaas (BEELINK-202): each shop connects its own account by pasting its API key, so there is no
   * app of bee-link's to configure — only which Asaas this deployment talks to. A key from the other
   * environment is refused. `ASAAS_CONTACT_EMAIL` goes in the User-Agent, which Asaas requires, and
   * receives Asaas's notices about the webhooks bee-link registers (a paused queue).
   */
  ASAAS_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  ASAAS_CONTACT_EMAIL: z.email().default('contato@beecoders.net'),

  /**
   * Seals what a shop's third parties gave it — Melhor Envio's tokens, the Asaas key — at rest: 32
   * random bytes in base64 (`openssl rand -base64 32`). Losing it loses every connection, which then
   * has to be made again; leaking it with a database dump hands over every shop's access.
   */
  INTEGRATIONS_SECRET_KEY: blankAsAbsent(
    z.string().refine((value) => Buffer.from(value, 'base64').length === 32, 'INTEGRATIONS_SECRET_KEY must be 32 bytes in base64'),
  ),
}).refine(
  // All three or none: half of it is a deployment that shows the button and fails at the callback.
  (value) => [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET, value.GOOGLE_REDIRECT_URI].every((part) => part === undefined) ||
    [value.GOOGLE_CLIENT_ID, value.GOOGLE_CLIENT_SECRET, value.GOOGLE_REDIRECT_URI].every((part) => part !== undefined),
  { message: 'GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI go together: set all three or none', path: ['GOOGLE_CLIENT_ID'] },
).refine(
  // Same reason; and an app with nowhere to seal its tokens could connect a shop and keep nothing.
  (value) => {
    const parts = [value.MELHOR_ENVIO_CLIENT_ID, value.MELHOR_ENVIO_CLIENT_SECRET, value.MELHOR_ENVIO_REDIRECT_URI];
    return parts.every((part) => part === undefined) || (parts.every((part) => part !== undefined) && value.INTEGRATIONS_SECRET_KEY !== undefined);
  },
  { message: 'MELHOR_ENVIO_CLIENT_ID, MELHOR_ENVIO_CLIENT_SECRET and MELHOR_ENVIO_REDIRECT_URI go together, with INTEGRATIONS_SECRET_KEY: set all four or none of the three', path: ['MELHOR_ENVIO_CLIENT_ID'] },
);

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
