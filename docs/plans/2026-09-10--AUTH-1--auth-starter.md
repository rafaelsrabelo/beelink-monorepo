# AUTH-1 — Auth starter

## Context

The template ships a web app, an API and a mobile app with no way to know who is using them. This ticket adds accounts end to end — sign-up with e-mail verification, sign-in, sessions that refresh, password reset — and the design system the screens are drawn with. It follows the shape of [laripeanuts/ubisafe-design-system](https://github.com/laripeanuts/ubisafe-design-system): tokens → primitives → blocks, every piece in Storybook, and a README that shows the thing working.

## Definition of Done

1. `pnpm stack:up` starts Postgres and Mailpit; `pnpm db:migrate` applies the schema.
2. `POST /api/auth/register` creates an unverified account and sends a verification e-mail that arrives in Mailpit; a taken e-mail answers `409 AUTH_EMAIL_TAKEN`.
3. `POST /api/auth/verify-email` verifies with a valid link token; a spent, expired or unknown token answers `400 AUTH_TOKEN_INVALID`. `POST /api/auth/resend-verification` answers `202` for any address and sends only to an existing unverified account.
4. `POST /api/auth/login` answers an `AuthSession` — a 15-minute access JWT, a 30-day refresh token and the user. A wrong password and an unknown e-mail both answer `401 AUTH_INVALID_CREDENTIALS`; an unverified account answers `403 AUTH_EMAIL_NOT_VERIFIED`.
5. `POST /api/auth/refresh` rotates the refresh token; presenting a spent one revokes the whole session and answers `401 AUTH_REFRESH_REUSED`. `POST /api/auth/logout` revokes the session and answers `204`, for an unknown token too.
6. `POST /api/auth/forgot-password` answers `202` for any address and e-mails a reset link (1 hour, single use) to an existing account; `POST /api/auth/reset-password` sets the password, ends every session of the account and answers `204`.
7. Every route requires a bearer token unless marked `@Public()`; without a valid one it answers `401 AUTH_UNAUTHENTICATED`. `GET /api/users/me` answers the signed-in `User`.
8. Login, register, forgot-password and resend-verification are rate limited per IP; the limit answers `429 RATE_LIMITED` in the same `ApiErrorBody` shape as every other error.
9. Swagger at `/api/docs` documents every endpoint, its body and its answers, and "Authorize" with a bearer token works.
10. Passwords are stored as argon2id hashes, refresh and e-mail tokens as SHA-256 hashes; no token or password reaches a log line.
11. `packages/ui` (`@harness-monorepo/ui`) holds the design system: tokens (light and dark), the shadcn primitives the screens use, and presentational blocks — the auth layout and forms, and the sections of shadcn's `dashboard-01`. Storybook (`pnpm storybook`, port 6006) shows every primitive and block, with a light/dark toggle and the a11y panel.
12. `apps/web` serves `/login`, `/signup`, `/verify-email`, `/forgot-password` and `/reset-password` inside one auth layout, and `/dashboard` built from `dashboard-01` with the signed-in user in the sidebar. `/` goes to the dashboard; a signed-out visitor of an `(app)` route lands on `/login`, and a signed-in visitor of an `(auth)` route on `/dashboard`.
13. Page JavaScript never sees a token: route handlers keep both in `httpOnly` cookies, and `src/proxy.ts` refreshes the access token when it has expired.
14. Tests: API unit tests; API e2e against real Postgres and Mailpit; a component test with an axe check for every block; web tests for services and screens; one Playwright journey — sign up → open the e-mail in Mailpit → verify → sign in → dashboard → sign out.
15. `pnpm ci-check` is green, and CI runs the e2e suites against service containers.
16. The README, in English and in the reference's style: what it is, the stack, how to run it, the screens, the numbers. Docs follow the code: the product's account rules, the API and web surface maps, a contract for `packages/ui`, the rules on where a component lives.

## Decisions

**Prisma 7.10.0, not the Prisma 8 release candidate.** A `prisma init` from the 8.0.0-rc line had been run in `main`'s working tree: it rewrote `apps/api`'s tsconfig, replaced `.env.example`, and wrote 578 agent-skill files into four tool folders. It was reverted, uncommitted. Trap 4 of the root contract pins a stable release, and 8's contract model is a different ORM from the one the API's code and docs describe.

**Access JWT plus an opaque refresh token, no Passport.** `@nestjs/jwt` signs a 15-minute HS256 access token. The refresh token is 32 random bytes, stored as its hash and rotated on every use. Each token belongs to a session family: a spent token presented again means it leaked, so the whole family is revoked. Passport would add a strategy layer around a single strategy — the guard that verifies the JWT is a few dozen lines.

**Tokens hashed with SHA-256, passwords with argon2id.** A token is 256 bits of randomness already; a slow hash buys nothing and costs time on every refresh. A password is low-entropy, so it gets the slow, memory-hard hash — `@node-rs/argon2`, which ships prebuilt binaries and needs no native build step.

**The web keeps tokens in httpOnly cookies, written by Next route handlers.** The browser talks to Next to log in, refresh and log out; Next talks to the API. The calls that carry no token — register, verify, resend, forgot, reset — go straight from the browser to the API. Tokens in memory or in web storage would be in reach of any script on the page.

**`src/proxy.ts` is optimistic; the API is the lock.** Next 16's proxy redirects on the presence of a session cookie and refreshes an expired access token before the page renders. It never grants access: the API checks the bearer token on every request.

**Accounts replace tasks as the example domain.** `tasks` existed as contracts, product rules and a module import, never as code. Accounts are what every product built on this template needs first. `packages/contracts/src/task.ts` is gone; `ApiErrorBody` moved to `error.ts`.

**The product speaks pt-BR; the repository speaks English.** Screens, e-mails and error copy are Brazilian Portuguese. Identifiers, comments, docs and the README are English.

**A design-system workspace: `packages/ui`.** The reference keeps its design system in its own package, with Storybook and tests beside the components. The shadcn CLI supports the layout — `components.json` in `apps/web` points the `ui` alias at `@harness-monorepo/ui`, so `shadcn add` run from the app writes primitives into the package. Blocks there are presentational: data and navigation arrive through props, so Storybook renders them with no server behind.

**Mailpit simulates e-mail.** The API sends over SMTP with nodemailer. In development and tests Mailpit catches every message and exposes it through a REST API — which is how the e2e tests read the verification link. Production changes the SMTP URL, not the code.

**API e2e tests run against `harness_test`, created on demand.** The e2e setup creates the database when it is missing and applies the migrations, so the suite works the same on an existing volume, a fresh clone and CI. A Postgres init script would run only on an empty volume.

**Rate limits live in the Fastify layer.** `@fastify/rate-limit`, per route, keyed by IP. Its 429 is shaped into `ApiErrorBody`, so a client handles one error format.

## Order

Each step is a commit that leaves the tree green.

1. Contracts and the product's account rules.
2. Foundation: dependencies, the Prisma 7 client and first migration, Mailpit, the `packages/ui` skeleton — the API compiles again.
3. API: auth, users, mail, Swagger, rate limits, with unit and e2e tests.
4. Design system: primitives, blocks, Storybook, component tests.
5. Web: auth screens, session route handlers, proxy, dashboard, with tests.
6. The Playwright journey and the CI e2e job.
7. README and docs.

## Not covered

- Mobile screens. The contracts are ready for them; the mobile app gets its own ticket.
- OAuth providers (Google, ORCID). They add a way to start a session, not a new session model.
- A production e-mail provider and a deploy. `SMTP_URL` is the seam.
- Account deletion and data export.

## 2026-09-10 — Corrections after the version research

**The browser talks only to Next.** The plan sent the calls that carry no token — register, verify, resend, forgot, reset — from the browser straight to the API. They go through route handlers instead, like login: one origin for the browser, so the API needs no CORS for it, and every call forwards the client's address. Without that, the API's per-IP rate limit would see only the Next server and throttle everyone as one. `NEXT_PUBLIC_API_URL` is dropped; the web reads `API_URL`, on the server only.

**The API trusts a forwarded address from the proxy only.** Fastify's `trustProxy` is limited to the loopback by default and configurable, so `request.ip` is the browser's address when Next forwards it, and a direct caller cannot spoof it.

**A spent refresh token has a 20-second grace.** Two requests from one browser — two tabs, a prefetch — can present the same refresh token once the access token has expired. Without a grace the second looks like theft and signs the person out. Within 20 seconds of its rotation a spent token rotates again; after that, reuse revokes the session, as planned.

**Base UI, not Radix, under shadcn.** The shadcn CLI's default style since July 2026 is `base-nova`, built on Base UI, and `dashboard-01` and the login and signup blocks are published for it. Its components compose through a `render` prop, not `asChild`.

**Form state lives in the blocks.** An auth block owns its fields — react-hook-form with a zod schema for format — and hands valid values to `onSubmit`. The screen owns what happens next: the request, the server's error, the redirect. Every block stays interactive in Storybook with no server behind it.

**Pinned against npm's `latest` tag.** Vitest 4.1.11 — latest is 5.0, which the coverage plugin and Storybook's Vitest integration do not accept alongside 4 (root trap 5). `dotenv-expand` ^13 — latest is 1000.0.0, which runs shell commands during expansion. Prisma 7.10.0 — latest is an 8.0 RC.

## 2026-09-14 — What the design system kept, and what it dropped

**The dashboard's data table is not part of the starter.** `shadcn add dashboard-01` writes a
`data-table.tsx` of 883 lines — drag-to-reorder rows of invented documents, its own zod schema, a
drawer per row. It breaks non-negotiable 6 (250 lines) by more than three times, and none of it
belongs to a product about accounts. The dashboard keeps the sidebar, the header, the cards and the
chart, which is enough to show the design system and who is signed in. Anyone who wants the table
can `shadcn add` it and split it; that is a decision with an owner, not a default.

**Blocks take their data through props, so the sample content moved out.** The generated blocks
carried hardcoded users, revenue and 90 days of traffic. Those became props, and the fixtures that
feed the stories live beside them — the app passes its own. It is also what makes every block
render in Storybook with no server.

**A link component must pass every prop through.** The first version of `AnchorLink` accepted only
`href`, `className` and `children`. The sidebar primitive injects `aria-current`, data attributes
and handlers through the same prop, so a narrower link silently dropped behaviour. An accessibility
test caught it.
