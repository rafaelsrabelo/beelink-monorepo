# apps/api — workspace contract

> Root contract: [/AGENTS.md](../../AGENTS.md). It applies here in full.
> This file records only what is true in `apps/api` and not at the root.

**What:** the backend — NestJS 12 on Fastify, Prisma over Postgres. Port `3001`, prefix `/api`, Swagger at `/api/docs`.
**Surface map:** [docs/README.md](docs/README.md)

## Rules in addition to the root's

1. **Fastify, never Express.** CORS and security headers are Fastify plugins registered in `main.ts`, not Express middleware. Gate: `api/fastify-only`.
2. **Log through pino** (`nestjs-pino`). `console.*` bypasses the structured logger and its request id. Gate: `api/no-console`.
3. **Configuration is read once.** `src/shared/config/env.ts` parses `process.env` with zod at boot and fails loud on a missing variable; everything else imports `env` from it. Gate: `api/env-through-schema`.
4. **Contracts are imported as types** — `import type { User } from '@harness-monorepo/contracts'`. The package ships no JavaScript, so a value import compiles and then crashes the running API. Gate: `api/contracts-type-only`.
5. **A module is a folder** — `src/modules/<kebab-name>/` with `<name>.module.ts`, `<name>.controller.ts`, `<name>.service.ts` and `dto/`. The controller translates HTTP; the service holds the rule; a DTO validates input and maps output through a static `from…` factory.
6. **Validation is explicit.** The global `ValidationPipe` runs `whitelist`, `forbidNonWhitelisted` and `transform` — and **not** `enableImplicitConversion`, which coerces *after* a `@Transform` runs, so `Boolean('false')` quietly becomes `true`. Numbers and dates declare `@Type(() => Number)` / `@Type(() => Date)`.
7. **The database is reached through `PrismaService`** — one client, injected. A schema change ships its migration (`prisma migrate dev --name <what>`) in the same PR.
8. **Errors answer one shape**, `ApiErrorBody`: `{ statusCode, errorCode, message }`. `errorCode` is a stable string clients switch on.

## Commands

```bash
pnpm --filter api dev                       # watch mode on :3001
pnpm --filter api test                      # Vitest unit tests
pnpm --filter api exec prisma migrate dev   # create and apply migrations
pnpm --filter api exec prisma studio        # browse the database
```

## Traps

- **Prisma is pinned to 7.10.0** — its npm `latest` tag is a release candidate. See the root `AGENTS.md`, trap 4.
- **The API connects at boot.** With Postgres down it exits with Prisma's `P1001`, not on the first request — start Docker, then `pnpm db:up`.
