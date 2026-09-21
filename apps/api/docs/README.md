# apps/api — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── main.ts                     # Fastify · pino · helmet · CORS · validation · Swagger
├── app.module.ts               # JwtAuthGuard is registered globally here
├── app.setup.ts                # the request pipeline and the Fastify adapter, shared with the e2e tests
├── health.controller.ts
├── generated/prisma/           # `prisma generate` output — gitignored, never edited
├── modules/
│   ├── auth/                   # register · verify · login · refresh · logout · reset
│   │   ├── auth.constants.ts   # the product's TTLs, as decisions rather than configuration
│   │   ├── auth.tokens.ts      # opaque token + SHA-256
│   │   ├── email-token.service.ts
│   │   ├── session.service.ts  # sessions, rotation, reuse detection
│   │   └── jwt-auth.guard.ts
│   ├── stores/                 # the shop: the panel's writes and the storefront's one read
│   │   ├── stores.controller.ts            # create · mine · public · by slug · update
│   │   ├── stores.service.ts               # assertOwnership() — the rule the legacy left to RLS
│   │   ├── stores.constants.ts             # reserved slugs · the closed unions · the bounds
│   │   ├── store.mapper.ts                 # row → PublicStore / Store, and the layout blob
│   │   ├── store-layout-settings.schema.ts # validates the one blob that stays a blob
│   │   ├── store-geocoder.service.ts       # the outbound address lookup, server-side
│   │   ├── store-categories.{controller,service}.ts   # the platform's taxonomy of shops
│   │   ├── store-color-presets.{controller,constants}.ts  # the six palettes, as data
│   │   └── dto/                            # bodies in, Swagger shapes out
│   └── users/                  # GET /users/me
└── shared/
    ├── config/env.ts           # the only reader of process.env
    ├── http/                   # ApiExceptionFilter — every error leaves as ApiErrorBody
    ├── mail/                   # nodemailer over SMTP, pt-BR templates
    ├── prisma/                 # PrismaService + PrismaModule
    └── swagger/                # setupSwagger()
prisma/schema/                  # one *.prisma per domain — a new domain adds a file, never edits one
├── base.prisma                 # generator · datasource — the one pair Prisma allows
├── auth.prisma                 # users · sessions · refresh_tokens · email_tokens
└── store.prisma                # store_categories · stores, and the three enums they close over
prisma/seed/                    # platform data, re-runnable — `migrations.seed` in prisma.config.ts
└── store-categories.sql        # upserts the taxonomy on slug; `pnpm --filter api db:seed`
test/                           # e2e against real Postgres and Mailpit
```

## Environment

Every variable is declared in [../.env.example](../.env.example) and validated in `src/shared/config/env.ts`.

| Variable | Default | What |
|---|---|---|
| `NODE_ENV` | `development` | `development` · `test` · `production` |
| `PORT` | `3001` | |
| `API_PREFIX` | `api` | every route lives under it |
| `DATABASE_URL` | — | Postgres connection string; required |
| `CORS_ORIGINS` | `http://localhost:3000` | comma-separated list |
| `LOG_LEVEL` | `info` | pino level |
| `JWT_SECRET` | — | required, 32 characters or more; signs the access token |
| `SMTP_URL` | `smtp://localhost:1025` | Mailpit in development |
| `MAIL_FROM` | `Harness <nao-responda@harness.local>` | |
| `WEB_URL` | `http://localhost:3000` | where the links in e-mails point |
| `AUTH_RATE_LIMIT_MAX` | `5` | per IP, per window, on the unauthenticated auth routes |
| `AUTH_RATE_LIMIT_WINDOW` | `1 minute` | |
| `STORE_WRITE_RATE_LIMIT_MAX` | `20` | per IP, per window, on `POST /stores` and `PUT /stores/:slug` |
| `STORE_WRITE_RATE_LIMIT_WINDOW` | `1 minute` | |
| `TRUST_PROXY` | `loopback` | whose `x-forwarded-for` is believed |

## Endpoints

Every route needs `Authorization: Bearer <access token>` unless it is marked public. Errors always answer `{ statusCode, errorCode, message }`; clients switch on `errorCode`.

| Verb | Path | Public | What | Answers |
|---|---|---|---|---|
| `GET` | `/api/health` | yes | liveness — does not touch the database | `200` |
| `POST` | `/api/auth/register` | yes | create an account, e-mail the verification link | `201` · `409 AUTH_EMAIL_TAKEN` |
| `POST` | `/api/auth/verify-email` | yes | verify with the link's token | `204` · `400 AUTH_TOKEN_INVALID` |
| `POST` | `/api/auth/resend-verification` | yes | send the link again | `202`, for any address |
| `POST` | `/api/auth/login` | yes | open a session | `200 AuthSession` · `401 AUTH_INVALID_CREDENTIALS` · `403 AUTH_EMAIL_NOT_VERIFIED` |
| `POST` | `/api/auth/refresh` | yes | rotate the refresh token | `200 AuthSession` · `401 AUTH_TOKEN_INVALID` · `401 AUTH_REFRESH_REUSED` |
| `POST` | `/api/auth/logout` | yes | end this device's session | `204`, idempotent |
| `POST` | `/api/auth/forgot-password` | yes | e-mail a reset link | `202`, for any address |
| `POST` | `/api/auth/reset-password` | yes | set a new password, end every session | `204` · `400 AUTH_TOKEN_INVALID` |
| `GET` | `/api/users/me` | no | the signed-in person | `200 User` · `401 AUTH_UNAUTHENTICATED` |
| `POST` | `/api/stores` | no | open a shop — claims the slug, which never changes | `201 Store` · `400 STORE_SLUG_RESERVED` · `409 STORE_SLUG_TAKEN` · `404 STORE_CATEGORY_NOT_FOUND` |
| `GET` | `/api/stores/mine` | no | the signed-in shopkeeper's shops, newest first | `200 Store[]` |
| `GET` | `/api/stores/:slug/public` | yes | the shop window — the narrow storefront shape | `200 PublicStore` · `404 STORE_NOT_FOUND` |
| `GET` | `/api/stores/:slug` | no | the shop as its owner edits it | `200 Store` · `403 STORE_FORBIDDEN` · `404 STORE_NOT_FOUND` |
| `PUT` | `/api/stores/:slug` | no | replace what the panel edits — a full body, not a patch | `200 Store` · `400` on `slug`/`latitude`/`longitude` · `403 STORE_FORBIDDEN` · `404 STORE_NOT_FOUND` |
| `GET` | `/api/store-categories` | no | the platform's taxonomy of shops, by name | `200 StoreCategory[]` |
| `GET` | `/api/store-color-presets` | no | the six palettes the panel applies in one click | `200 StoreColorPreset[]` |

`GET /api/stores/mine` is declared above `GET /api/stores/:slug`: Nest matches in declaration order, and `mine` is on the reserved-slug list so no shop can occupy it either.

Ownership is explicit code, not a database policy: `StoresService.assertOwnership()` is the single gate every owner-facing read and every write passes through. A shop owned by somebody else answers **403**, not 404 — `/<slug>` is a public storefront, so its existence leaks nothing.

Rate limited per IP, all answering `429 RATE_LIMITED`: register, login, forgot-password and resend-verification; `POST /api/stores` and `PUT /api/stores/:slug`, because each can drive an outbound geocoding call this API waits up to four seconds on; and `GET /api/stores/:slug/public`, generously — every browser reaches it through the web app's server, so the limit sees one address for the whole storefront. The key is the address only because `TRUST_PROXY` lets the web app forward it: the plugin runs in Fastify's `onRequest`, before `JwtAuthGuard` has decoded the token, so there is no owner to key on.

Nothing caps how many shops one owner may open. The rate limit bounds the rate, not the total.

`store_categories` and the six colour presets are both platform data, and they are kept differently on purpose. The taxonomy is a table, because a shop points at a row of it, and it is seeded by [`prisma/seed/store-categories.sql`](../prisma/seed/store-categories.sql) — `pnpm --filter api db:seed`, or automatically by `prisma migrate dev`. The presets are a constant in the module, because nothing references a preset: applying one writes its four colours onto the shop, and the shop keeps the colours, not the choice. They are served rather than shipped as source because `web/no-hex-colors` scans `apps/web/src` and `packages/ui/src`, and twenty-four colour literals in either tree are the exact thing that gate exists to stop.

Swagger documents all of it at `/api/docs`, with an Authorize button that holds a bearer token. `@ApiBearerAuth()` goes on a handler, never on a controller class that also holds a `@Public()` route — on the class it marked the anonymous storefront read as needing a token.

## Tests

| Command | What it does |
|---|---|
| `pnpm --filter api test` | unit tests |
| `pnpm --filter api test:e2e` | e2e against real Postgres and Mailpit — needs `pnpm stack:up` |

The e2e suites run against `harness_test`, created and migrated on demand; the reset helper refuses any database whose name does not end in `_test`.

## Adding a module

`pnpm --filter api exec nest g resource modules/<name>`, then shape it to rule 5 of the contract.
