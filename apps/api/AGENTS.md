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
9. **A shop's third-party access is sealed, and opened in one folder.** What Melhor Envio or Asaas gave a shop lives in `StoreIntegration.secretSealed`, sealed by `modules/integrations/secret-vault.ts` (AES-256-GCM, bound to the shop and the party) under `INTEGRATIONS_SECRET_KEY`. Nothing outside `src/modules/integrations` reads the field or the vault, and nothing logs what it opens. Inside it, the Asaas key — which creates charges in a shop's own account — is sealed and opened only under `integrations/asaas/`. Gates: `api/sealed-secret-in-integrations`, `api/asaas-secret-in-asaas`.
10. **An order's charge is talked about with Asaas in one place, and a fact from Asaas comes in by one door.** `OrderPayments` (`modules/payments/`) is the only thing that creates or removes a charge: it takes the order's claim under the shop's row lock, commits, and only then calls Asaas — never a call with the lock held — and it lists what Asaas already holds for the order before creating. What Asaas says of a charge is written by `applyCharge` (`payment-facts.ts`), which never moves a charge back down the money's way — but for a receipt in cash the shop declared at Asaas and then undid; a row of `order_payments` leaves the living only once Asaas confirmed its charge is gone. Money crosses to Asaas through `asaas-money.ts`, and Asaas's least amounts live in `asaas-limits.ts`. A payment is learned of in one way, `PaymentSync` (BEELINK-206): the order's charges listed at the shop's account and written by `applyCharge`. A webhook's event is a reason to go there and nothing more — its body is never applied, so a token in the wrong hands cannot mark an order paid and an event out of order changes nothing. `applyCharge` is also the one place a charge is known to have just been paid (BEELINK-207): what that owes — the row of `order_paid_notices`, unique by order, which is the customer's e-mail outbox and what the panel's bell reads, and the line in the conversation — is written there, in the same transaction, so no caller can forget it and no second hearing tells it twice. Money given back comes in by the same door (BEELINK-208): Asaas gives a refund no id, so bee-link keeps its own row of each (`order_refunds`), reconciled from the sums Asaas tells of a charge (`reconcileRefunds`, called by `applyCharge`) — and what `order_payments` says of a refund, and whether a stray payment is settled, is derived from those rows and written nowhere else. `OrderRefunds` is the only thing that asks Asaas for one: a charge has one refund being asked at a time, claimed under the shop's row lock and committed before the call, always with its amount; a silence is not a no, and the charge is read before anything else is asked. The shop's cancellation of a paid order asks its refund first and cancels only once Asaas took it. Nothing outside `modules/payments` writes `order_payments`, `order_stray_payments` or `order_refunds`. Gate: `api/order-payments-in-payments`.

## Commands

| Command | What it does |
|---|---|
| `pnpm --filter api dev` | watch mode on `:3001` |
| `pnpm turbo test --filter=api` | Vitest unit tests, after `prisma generate` — `pnpm --filter api test` alone uses the client already generated |
| `pnpm --filter api test:e2e` | e2e against real Postgres and Mailpit (`pnpm stack:up` first) |
| `pnpm --filter api exec prisma migrate dev` | create and apply migrations. It does **not** seed — see below |
| `pnpm --filter api db:seed` | the seed, and the only thing that runs it. Platform data only, upserted on its slug; safe to repeat |
| `pnpm --filter api exec prisma studio` | browse the database |

## Traps

- **Prisma is pinned to 7.10.0** — its npm `latest` tag is a release candidate. See the root `AGENTS.md`, trap 4.
- **The API connects at boot.** With Postgres down it exits with Prisma's `P1001`, not on the first request — start Docker, then `pnpm db:up`.
- **No migrate command seeds. Reset, then seed — two commands.** On Prisma 5/6 `migrate dev` and `migrate reset` ran the seed; on 7 neither does, and neither says so: `migrate reset` succeeds, prints nothing about seeding, and leaves `store_categories` empty. The symptom lands in the panel, far from the cause — every shop's category select reads "Sem categoria", because the label is looked up in a list that has no rows. Always follow a reset with `pnpm --filter api db:seed`.
