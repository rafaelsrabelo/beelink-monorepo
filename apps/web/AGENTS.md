# apps/web — workspace contract

> Root contract: [/AGENTS.md](../../AGENTS.md). It applies here in full.
> This file records only what is true in `apps/web` and not at the root.

**What:** the browser surface — Next.js 16 App Router (code under `src/`), Tailwind 4, the design system from `@harness-monorepo/ui`. Port `3000`.
**Surface map:** [docs/README.md](docs/README.md)

## Rules in addition to the root's

1. **This is Next 16, not the Next you remember.** Read the guide bundled in `node_modules/next/dist/docs/` before using an API from memory. Middleware is `src/proxy.ts` now, and request APIs (`cookies()`, `headers()`, `params`) are async.
2. **Tokens never reach page JavaScript.** The access and refresh tokens live in `httpOnly` cookies written by the route handlers under `src/app/api/session/`, and `src/proxy.ts` refreshes them. Web storage holds nothing about a session. Gate: `web/no-web-storage`.
3. **The proxy is an optimistic check, not the lock.** `src/proxy.ts` redirects on the presence of a session cookie only; the API validates the bearer token on every request, and server code reads the user through `src/lib/session.ts`.
4. **Screens compose; `packages/ui` draws.** Primitives and presentational blocks come from `@harness-monorepo/ui`. This workspace wires them to data — services, form submission, routing. A block that needs a new look changes in `packages/ui`, with its story.
5. **Routes are grouped by who may see them:** `(auth)` for signed-out screens, `(app)` for signed-in ones. Each group owns its layout.
6. **An API `errorCode` becomes copy in one place:** `src/components/auth/auth-error-copy.ts`. Services throw the code; the screen asks that map for the sentence.
7. **No sentence is written inside a component.** Copy lives in `src/locales/`, one file per language, behind an interface — a missing key is a compile error, not a word in the wrong language on someone's screen. The server picks the language from the `locale` cookie, then from `Accept-Language`, and hands the dictionaries down as props; they are plain data, so they survive the trip to a Client Component.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev:web` | http://localhost:3000 — needs the API on `:3001` |
| `pnpm --filter web test` | Vitest — route handlers, proxy, services |
| `pnpm --filter web test:e2e` | Playwright — needs `pnpm stack:up` and a build |
| `pnpm --filter web exec shadcn add <name>` | primitives land in `packages/ui`, blocks here |

## Traps

- **`next dev` appends its own agent block** to the end of this file. Keep it: removing it only re-creates the change on the next run.
- **The browser never calls the API.** Every request from a page goes to a route handler under `src/app/api/`, which calls the API through `API_URL`, a server-only variable. A `NEXT_PUBLIC_` URL would be inlined into the bundle at build time — and would invite calls that cannot carry the httpOnly token.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
