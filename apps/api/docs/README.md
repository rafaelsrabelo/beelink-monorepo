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
│   └── users/                  # GET /users/me
└── shared/
    ├── config/env.ts           # the only reader of process.env
    ├── http/                   # ApiExceptionFilter — every error leaves as ApiErrorBody
    ├── mail/                   # nodemailer over SMTP, pt-BR templates
    ├── prisma/                 # PrismaService + PrismaModule
    └── swagger/                # setupSwagger()
prisma/schema.prisma            # users · sessions · refresh_tokens · email_tokens
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

Rate limited per IP: register, login, forgot-password and resend-verification — `429 RATE_LIMITED`.

Swagger documents all of it at `/api/docs`, with an Authorize button that holds a bearer token.

## Tests

| Command | What it does |
|---|---|
| `pnpm --filter api test` | unit tests |
| `pnpm --filter api test:e2e` | e2e against real Postgres and Mailpit — needs `pnpm stack:up` |

The e2e suites run against `harness_test`, created and migrated on demand; the reset helper refuses any database whose name does not end in `_test`.

## Adding a module

`pnpm --filter api exec nest g resource modules/<name>`, then shape it to rule 5 of the contract.
