# apps/api — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── main.ts                 # Fastify · pino · helmet · CORS · validation · Swagger
├── app.module.ts
├── app.setup.ts            # the request pipeline — main.ts and the e2e tests boot the same one
├── health.controller.ts
└── shared/
    ├── config/env.ts       # the only reader of process.env
    ├── http/               # ApiExceptionFilter — every error leaves as ApiErrorBody
    ├── prisma/             # PrismaService + PrismaModule
    └── swagger/            # setupSwagger()
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

## Endpoints

| Verb | Path | What |
|---|---|---|
| `GET` | `/api/health` | liveness — does not touch the database |

## Adding a module

`pnpm --filter api exec nest g resource modules/<name>`, then shape it to rule 5 of the contract.
