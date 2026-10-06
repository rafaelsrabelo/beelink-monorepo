# apps/web — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

This is the bee-link browser surface. Phase 0 put the plumbing here; **phase 1 adds the `stores` domain** — a shopkeeper signs in, creates a shop and edits everything the legacy panel let them edit, at the addresses the legacy app already used. The shop window at `/<slug>` is still not served: it is phase 3, and `src/lib/public-api.ts` is still waiting for its first caller.

## Layout

```
src/
├── proxy.ts                    # the allow-list matcher + the only place that refreshes a token
├── app/
│   ├── layout.tsx              # <html lang>, providers, toaster
│   ├── page.tsx                # "/" — Beelink's landing page (blocks/landing), public, outside the proxy
│   ├── (auth)/                 # login · signup · verify-email · forgot-password · reset-password
│   ├── (admin)/                # the signed-in shell: /dashboard · /create-store · /admin/<slug>
│   └── api/
│       ├── session/route.ts    # POST signs in, DELETE signs out — the cookies are written here
│       ├── auth/[action]/      # register · verify-email · resend-verification · forgot · reset
│       ├── stores/             # GET mine · POST create · GET/PUT one — the admin lane
│       ├── store-categories/   # the platform's taxonomy, for the panel's category select
│       ├── store-color-presets/ # the six named palettes the appearance tab applies in one click
│       ├── cep/[zipCode]/      # ViaCEP, server-side — a component may not reach a third party
│       └── uploads/            # the upload seam: 501 until a storage adapter lands behind it
├── components/
│   ├── auth/                   # one screen per form: block + service + the error-to-copy map
│   ├── store/                  # the shop screens, the error-to-copy map and the form↔wire mapper
│   ├── app-shell.tsx           # sidebar, header, sign-out — the menu is built from the address
│   ├── app-link.tsx            # next/link behind the design system's plain-string href
│   ├── landing/brand-font.ts   # Plus Jakarta Sans, loaded by the landing alone
│   ├── landing/brand-photo.tsx # next/image over a photo from src/assets/images — drop a file there, import it
│   └── locale-switcher.tsx
├── lib/
│   ├── api.ts                  # the session-bearing caller — `cache: "no-store"`
│   ├── viacep.ts               # the postcode lookup, and the 200-with-`erro` answer it traps
│   ├── public-api.ts           # the anonymous caller — `revalidate` + tags. No caller yet
│   ├── revalidate.ts           # the only caller of revalidateTag — the store handlers call it
│   ├── bff.ts                  # origin check, IP forwarding, pass-through, the admin lane
│   ├── locale.ts               # cookie, then Accept-Language
│   ├── refresh-session.ts      # renewed · rejected · unavailable
│   ├── session.ts              # getCurrentUser / requireUser, memoised per request
│   └── session-cookies.ts      # bl_access · bl_refresh, httpOnly
├── locales/                    # pt-BR.ts · en.ts, behind one interface
└── services/
    ├── auth/                   # requests + TanStack mutations
    ├── cep/                    # the postcode lookup as the address tab's callback
    ├── uploads/                # uploadImage() — the one function in this app that sends bytes
    └── stores/                 # requests, query hooks, the storeKeys factory
```

`src/lib/revalidate.ts` now has callers: every store mutation handler drops the cached `store:<slug>` and `catalog:<slug>` entries on a 2xx. `src/lib/public-api.ts` is still unused — it is the anonymous read path, and `(storefront)/` arrives with the phase that builds it. There is no `src/stores/` Zustand directory yet either; the cart is what creates one.

## Routes

| Path | Who sees it | What |
|---|---|---|
| `/` | anyone | redirects to `/dashboard`, which the proxy guards |
| `/login` · `/signup` | signed out | the auth blocks, wired to the route handlers |
| `/verify-email` | anyone | spends the link's token **on the server**, then offers a new link |
| `/forgot-password` · `/reset-password` | signed out | request and set a new password |
| `/dashboard` | signed in | the shops this person owns, or the empty state that leads to `/create-store` |
| `/create-store` | signed in | one tabbed form, not the legacy's five steps — and it posts the address, the handles and the palette the wizard collected and then dropped |
| `/admin/[slug]` | the owner | that shop's panel home |
| `/admin/[slug]/store` | the owner | the settings: five tabs, one save, one `PUT` |
| `/admin/[slug]/cashback` | the owner | the cashback rules, with what they give on an order of R$ 100,00, and what the shop owes in credit (BEELINK-242); a customer's credit is on their record |
| `/admin/[slug]/integrations` | the owner | the shop's integrations as a list — what it connected, working or to mend, each leading to its own page — and "Nova integração" |
| `/admin/[slug]/integrations/new` | the owner | what there is to connect, a card each; one already connected leads to its page |
| `/admin/[slug]/integrations/melhor-envio` | the owner | the shop's Melhor Envio account — connect, whose account, the wallet, reconnect, disconnect — and, connected, how it ships by carrier: services, days to post, default parcel (BEELINK-183). The way back from Melhor Envio lands here with `?conectado=` or `?erro=` |

Both forms are `react-hook-form` inside a `packages/ui` block, and every request they need is a callback the screen hands in: the palettes, the postcode lookup and the image upload. That is what keeps `web/no-fetch-in-components` at zero while a tab still offers a button that reaches the network.

| Handler | Lane | What |
|---|---|---|
| `/api/store-color-presets` | admin | forwards the six palettes; they are served rather than shipped because `web/no-hex-colors` scans this tree |
| `/api/cep/[zipCode]` | signed in, **not** forwarded | calls ViaCEP server-side. `CEP_NOT_FOUND` and `CEP_UNAVAILABLE` are separate codes: a mistyped postcode and an outage are not the same answer, and neither blocks the save |
| `/api/uploads` | signed in | answers **501 `UPLOAD_NOT_CONFIGURED`** today. Where bytes are stored is a separate decision; when it lands it replaces this one handler and nothing above it — `uploadImage()`, the hook, the field and the sentence are finished |
| `/api/stores/[slug]/integrations/melhor-envio` | admin | the shop's Melhor Envio connection (`GET`) and disconnecting it (`DELETE`, the API's 204 answered as 200) — BEELINK-182 |
| `/api/stores/[slug]/integrations/melhor-envio/connect` | admin, **a link** | asks the API for the authorization page and sends the browser there (303), remembering the shop in `bl_integration_return` on `/api/integrations` only. Origin-checked, not JSON-checked: a followed link sends no JSON header |
| `/api/integrations/melhor-envio/callback` | admin | Melhor Envio's one fixed return address, for every shop: hands the code and the state to the API with the owner's session, then lands on `/admin/<slug>/integrations/melhor-envio?conectado=…` or `?erro=<code>` |
| `/api/integrations/melhor-envio/webhook` | public, **not** origin-checked | Melhor Envio telling of a label (BEELINK-188): the bytes go to the API as they arrived, with `X-ME-Signature` beside them — the signature is over those bytes, so the body is never parsed here. The API refuses what the app did not sign |
| `/api/stores/[slug]/integrations/melhor-envio/account` · `/settings` | admin | the wallet and Melhor Envio's services, read there and then; the carrier settings (`GET`, `PUT`) — BEELINK-183 |
| `/api/stores/[slug]/page-templates` · `/[templateId]/preview` | admin | the models a page of the shop may be arranged with (`?pageId=`), and one of them as it would look there, from the shop's own products (`?pageId=`, `?productId=`, `?categoryId=`; an empty value is left out) — BEELINK-263. Reads: nothing is revalidated. Design mode's gallery of models (`components/design/page-templates.tsx`, opened from the bar's "Modelos") is their one caller |
| `/api/stores/[slug]/pages/[pageId]/apply-template` | admin | a model written over the page's draft (`POST`, `ApplyTemplatePayload`), naming the revision the editor read in `x-page-revision` — BEELINK-264. **Nothing is revalidated**: applying does not publish. Called through `draftWrite`, after the editor's own saves; the gallery asks first (`use-template-apply.ts`), a 409 opens the editor's conflict dialog with the choice kept in the address (`?templates=1&template=&product=`, `template-choice-address.ts`), and `template-applied.tsx` then says the model is in the draft and lists the page's problems |

`src/proxy.ts` runs on an allow-list: `/dashboard`, `/admin`, `/create-store`, and the five auth screens, each with its subtree. Everything else is public and reaches its page without a redirect, which is what will let `/<slug>` be served anonymously and indexed. On the paths it does match, it redirects on the presence of a cookie and refreshes an expired access token before the page renders. It also takes the panel's route handlers under `/api` — save `session`, `auth`, `customer` and `storefront` — when a panel refresh cookie is there, and renews the pair three minutes before the access token runs out or once it has, so a panel left open keeps working (BEELINK-169). It never grants access: the API checks the bearer token on every call.

## Session

The browser never holds a token. `POST /api/session` calls the API, keeps both tokens in `httpOnly` cookies (`bl_access`, `bl_refresh`, `SameSite=Lax`, `Secure` in production) and answers only the user. Every handler refuses a cross-origin request and forwards the caller's address, so the API's per-IP rate limit sees people rather than this server. Signing in and signing out are full page loads (`src/lib/start-over.ts`), never the router's: the query cache and every store outlive a client-side navigation, and the next person on the tab was shown the last one's shops.

When the API cannot be reached, a refresh answers `unavailable` and the session is left alone — an outage is not a sign-out.

## Environment

| Variable | Default | What |
|---|---|---|
| `API_URL` | `http://localhost:3001/api` | server-only; there is no `NEXT_PUBLIC` twin, because the browser never calls the API |

## Configuration

`next.config.ts` turns on `typedRoutes`, so `next typegen` writes the route union and the `PageProps` / `RouteContext` helpers; `type-check` runs the typegen before tsc for that reason. The brand's photos live in `src/assets/images` and are drawn with `BrandPhoto` (`next/image`, `fill`, blur placeholder): a static import is served as AVIF or WebP at the width the screen needs, under a hashed name cached for good, and the original never leaves the server — drop a file there and import it, nothing else. `images.formats` puts AVIF first. `images.remotePatterns` allows `res.cloudinary.com`, where every product image of the legacy bee-link lives and will keep living — the migration moves rows, not bytes.

## Language

`src/locales/` holds one file per language behind a single interface, so a missing key fails the build. pt-BR is the product's language and the default an unrecognised browser gets; `en.ts` is still here and the switcher still offers it, on the auth screens and in the signed-in shell. The choice lands in the `bl_locale` cookie, prefixed like the session cookies. Both dictionaries — the screens' and the design system's — are passed down as props.

## Tests

| Command | What it does |
|---|---|
| `pnpm --filter web test` | route handlers (the postcode lookup and the upload seam included), proxy, the matcher's allow-list, services, the form↔wire mapper, error copy |
| `pnpm --filter web test:e2e` | Playwright on ports 3100/3101 — needs `pnpm stack:up` and a build |
