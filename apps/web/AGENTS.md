# apps/web — workspace contract

> Root contract: [/AGENTS.md](../../AGENTS.md). It applies here in full.
> This file records only what is true in `apps/web` and not at the root.

**What:** the bee-link browser surface — a public storefront at `/<slug>` and its owner's panel at `/admin/<slug>`. Next.js 16 App Router (code under `src/`), Tailwind 4, the design system from `@harness-monorepo/ui`. Port `3000`.
**Surface map:** [docs/README.md](docs/README.md)

The workspace is called `web` and not `bee-link` on purpose: the name is what the turbo filters, the CI jobs, the Playwright config and every doc in this repo already say. bee-link is the product it serves, and there is no second web app to disambiguate from.

## Rules in addition to the root's

1. **This is Next 16, not the Next you remember.** Read the guide bundled in `node_modules/next/dist/docs/` before using an API from memory. Middleware is `src/proxy.ts`; `cookies()`, `headers()`, `params` and `searchParams` are async; a page takes `PageProps<"/path">` and a route handler `RouteContext<"/path">`, both written by `next typegen`, which `type-check` runs before tsc.

2. **Three lanes reach the API, and who is asking picks the lane.** This is the likeliest thing to get wrong here, because the harness template this repo grew from has one lane and every reflex points at it.
   - *The public catalogue, on the server.* A Server Component calls `src/lib/public-api.ts` directly, with `next: { revalidate, tags }` under `store:<slug>` and `catalog:<slug>`. It is a module of its own, apart from `src/lib/api.ts`, because that one pins `cache: "no-store"` — right for a session, wrong for a catalogue served to strangers and to crawlers. `src/lib/revalidate.ts` is the only caller of `revalidateTag`: every admin handler calls it on a 2xx, so an invalidation that escapes leaves a catalogue stale until its window closes rather than stale forever.
   - *Anything the browser asks for.* A BFF route handler under `src/app/api/`, which runs `refuseCrossOrigin()` and forwards `clientIpOf()` from `src/lib/bff.ts` — the API's per-IP rate limit has to see the visitor's address, not this server's. Order creation is the most abusable endpoint in the product, and that limit is its only guard.
   - *The admin.* A TanStack Query hook, then a BFF handler, then Nest. Unchanged from the template.

   Server code talking to the API straight is ordinary here, not a loophole: `src/lib/session.ts` has always called `callApi()` from a Server Component. What the BFF protects is a token held by page JavaScript. The storefront holds no token, and it does need HTML a crawler can read without running a script.

3. **The proxy matcher is an allow-list, and the proxy is never the lock.** `src/proxy.ts` names the signed-in paths and the auth screens; every path it does not name is public, deliberately. Restoring the template's matcher — which excludes a handful of paths and guards all the rest — answers every crawler with a 302 for the whole storefront, and nothing but `src/proxy.test.ts` would notice. What the proxy does is redirect on the presence of a cookie and refresh an expired pair; the API validates the bearer token on every call, and who owns a store is decided there, never here. A shop path reaches it only when a shopper's refresh cookie is there and the access cookie is not — to keep that shopper signed in — and it never redirects one.

4. **Session cookies are `bl_access` and `bl_refresh`.** Written by the handlers under `src/app/api/session/`, refreshed in `src/proxy.ts`, `httpOnly` at both ends: page JavaScript never holds a token and web storage holds nothing about a session. Gate: `web/no-web-storage`. Never `hm_*` — that prefix was the harness, and two sessions under one parent domain answering to one name hand each other's tokens around. A shopper's session is `bl_customer_access` and `bl_customer_refresh`, written by `src/app/api/storefront/[slug]/customer/` and never standing in for the panel's: one person may be both, and the API refuses a token from the wrong door. `bl_locale`, and the `bl_cart` and `bl_prefs` that arrive with the storefront, carry the prefix for the same reason.

5. **Routes are grouped by who is reading them.** `(storefront)` for `/<slug>` — anonymous, indexed, carrying no session — `(admin)` for `/admin/<slug>`, which is signed in, and `(auth)` for the signed-out screens. Each group owns its layout, because a shop window and a control panel share almost no chrome. `(storefront)` arrives with the phase that fills it; `(auth)` and `(admin)` are what exists today — `(admin)` is the template's `(app)`, renamed when the panel's routes landed in it.

6. **A store's brand colour is data, not a literal.** It comes from the database, per store, and is applied once as CSS custom properties on the storefront's root element; every component below reads the variable. That is what keeps the `web/no-hex-colors` gate at absolute zero instead of carrying an exception for the one legitimate case in the product.

7. **The cart is persisted in a cookie.** Non-`httpOnly`, scoped to `path=/<slug>`, holding `{ productId, variantId, qty }` and nothing more so it stays under the 4 KB limit — names and prices come from the catalogue, which is cached already. A Zustand store stays the in-memory source of truth and writes through on every change. The payoff beyond the storage gate: a Server Component can read the cart, so the checkout summary renders in the HTML instead of flashing in after hydration.

8. **Screens compose; `packages/ui` draws.** Primitives and presentational blocks come from `@harness-monorepo/ui`. This workspace wires them to data — services, form submission, routing. A block that needs a new look changes in `packages/ui`, with its story.

9. **An API `errorCode` becomes copy in one place:** `src/components/auth/auth-error-copy.ts`. Services throw the code; the screen asks that map for the sentence.

10. **No sentence is written inside a component.** Copy lives in `src/locales/`, one file per language behind an interface, so a missing key fails the build instead of putting a word in the wrong language on a customer's screen. The product's language is pt-BR, and it is what an unrecognised browser gets. The dictionaries are plain data and are handed down as props, which is what lets them cross into a Client Component.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev:web` | http://localhost:3000 — needs the API on `:3001` |
| `pnpm --filter web test` | Vitest — route handlers, proxy, services |
| `pnpm --filter web test:e2e` | Playwright — needs `pnpm stack:up` and a build |
| `pnpm --filter web exec shadcn add <name>` | primitives land in `packages/ui`, blocks here |

## Traps

- **`next dev` appends its own agent block** to the end of this file. Keep it: removing it only re-creates the change on the next run, and it spends roughly eight of the 120 lines the docs gate allows.
- **The browser never calls the API.** It reaches a route handler under `src/app/api/`, which calls `API_URL` — a server-only variable. A `NEXT_PUBLIC_` twin would be inlined into the bundle and would invite calls that cannot carry the httpOnly token.
- **`src/app/layout.tsx` awaits `getMessages()`, and that reads cookies.** Reading a request API in the root layout opts every route under it out of static rendering. Harmless while every screen is signed in; a blocker the day `(storefront)` lands, because the shop window is exactly the page that has to be prerendered and revalidated. Resolve it there — the storefront's language is a constant — rather than working around it in a page.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
