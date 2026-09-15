# apps/web — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── proxy.ts                    # optimistic redirects + the only place that refreshes a token
├── app/
│   ├── layout.tsx              # <html lang>, providers, toaster
│   ├── page.tsx                # "/" → /dashboard
│   ├── (auth)/                 # login · signup · verify-email · forgot-password · reset-password
│   ├── (app)/                  # the signed-in shell and the dashboard
│   └── api/
│       ├── session/route.ts    # POST signs in, DELETE signs out — the cookies are written here
│       └── auth/[action]/      # register · verify-email · resend-verification · forgot · reset
├── components/
│   ├── auth/                   # one screen per form: block + service + the error-to-copy map
│   ├── app-shell.tsx           # sidebar, header, sign-out
│   └── locale-switcher.tsx
├── lib/
│   ├── api.ts                  # the only caller of the API
│   ├── bff.ts                  # origin check, IP forwarding, pass-through
│   ├── locale.ts               # cookie, then Accept-Language
│   ├── refresh-session.ts      # renewed · rejected · unavailable
│   ├── session.ts              # getCurrentUser / requireUser, memoised per request
│   └── session-cookies.ts      # hm_access · hm_refresh, httpOnly
├── locales/                    # pt-BR.ts · en.ts, behind one interface
└── services/auth/              # requests + TanStack mutations
```

## Routes

| Path | Who sees it | What |
|---|---|---|
| `/` | signed in | redirects to `/dashboard` |
| `/login` · `/signup` | signed out | the auth blocks, wired to the route handlers |
| `/verify-email` | anyone | spends the link's token **on the server**, then offers a new link |
| `/forgot-password` · `/reset-password` | signed out | request and set a new password |
| `/dashboard` | signed in | the shell, the cards and the chart |

`src/proxy.ts` redirects on the presence of a cookie and refreshes an expired access token before the page renders. It never grants access: the API checks the bearer token on every call.

## Session

The browser never holds a token. `POST /api/session` calls the API, keeps both tokens in `httpOnly` cookies (`hm_access`, `hm_refresh`, `SameSite=Lax`, `Secure` in production) and answers only the user. Every handler refuses a cross-origin request and forwards the caller's address, so the API's per-IP rate limit sees people rather than this server.

When the API cannot be reached, a refresh answers `unavailable` and the session is left alone — an outage is not a sign-out.

## Environment

| Variable | Default | What |
|---|---|---|
| `API_URL` | `http://localhost:3001/api` | server-only; there is no `NEXT_PUBLIC` twin, because the browser never calls the API |

## Language

`src/locales/` holds one file per language behind a single interface, so a missing key fails the build. The server reads the `locale` cookie, falls back to `Accept-Language`, and passes both dictionaries — the screens' and the design system's — down as props.

## Tests

| Command | What it does |
|---|---|
| `pnpm --filter web test` | route handlers, proxy, services, error copy |
| `pnpm --filter web test:e2e` | Playwright — needs `pnpm stack:up` and a build |
