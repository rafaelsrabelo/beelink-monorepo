# apps/api — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── main.ts                 # Fastify · pino · helmet · CORS · validation · Swagger
├── app.module.ts
├── health.controller.ts
├── shared/
│   ├── config/env.ts       # the only reader of process.env
│   ├── prisma/             # PrismaService + PrismaModule
│   └── swagger/            # setupSwagger()
└── modules/
    └── tasks/              # the example domain
        ├── dto/
        ├── tasks.controller.ts
        ├── tasks.module.ts
        └── tasks.service.ts
prisma/schema.prisma
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

## Endpoints

| Verb | Path | What |
|---|---|---|
| `GET` | `/api/health` | liveness |
| `GET` | `/api/tasks` | the list, most recently updated first |
| `POST` | `/api/tasks` | create — every task starts as `todo` |
| `PATCH` | `/api/tasks/:id/status` | move one step; an illegal move answers `409 TASK_INVALID_TRANSITION` |

## Adding a module

`pnpm --filter api exec nest g resource modules/<name>`, then shape it to rule 5 of the contract.
