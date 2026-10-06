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
│       ├── page-templates/     # the models a store not created yet may open with, for the create form
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
| `/create-store` | signed in | one tabbed form, not the legacy's five steps — and it posts the address, the handles and the palette the wizard collected and then dropped. Its last step offers a shop, folded away, the home it opens with: the default page, chosen, or a model of the catalogue (`GET /api/page-templates`, asked with the type and the category the form has picked — the category only orders them). None picked sends no `template` (BEELINK-266) |
| `/admin/[slug]` | the owner | that shop's panel home: what is left to set up, a card each — and, on a shop (never a site), BeeFlow's banner over them (`src/assets/images/beeflow-banner.jpg`, the artwork whole, through `BrandPhoto`), a link to the shop's Integrations |
| `/admin/[slug]/store` | the owner | the settings: five tabs, one save, one `PUT` |
| `/admin/[slug]/cashback` | the owner | the cashback rules, with what they give on an order of R$ 100,00, and what the shop owes in credit (BEELINK-242); a customer's credit is on their record |
| `/admin/[slug]/integrations` | the owner | every integration there is (Melhor Envio, Asaas), a card each, connected or not: the brand's own mark (`INTEGRATION_LOGOS`, files under `public/brand/integrations/`), what it gives, where it stands — "Conectado" in green — whose account, and the way on: "Conectar", "Configurar" or "Reconectar". Melhor Envio's "Conectar" is a plain link to the route that leaves for its authorization; Asaas's is the app's link to its own page, where the key is typed. Each connection is read on its own: its card alone holds a skeleton or says its read failed. After them, what is on its way (`UPCOMING_INTEGRATIONS`: BeeFlow), announced as "Em breve" with nothing to press — read from nowhere, with no API, route or page behind it |
| `/admin/[slug]/integrations/new` | the owner | redirects to `/admin/[slug]/integrations`: adding an integration was a page of its own until the list began showing them all |
| `/admin/[slug]/integrations/melhor-envio` | the owner | the shop's Melhor Envio account — connect, whose account, the wallet, reconnect, disconnect — and, connected, how it ships by carrier: services, days to post, default parcel (BEELINK-183). The way back from Melhor Envio lands here with `?conectado=` or `?erro=` |
| `/admin/[slug]/integrations/asaas` | the owner | the shop's Asaas account — the API key pasted into a secret's field, whose account it is, where its payment notices stand, replacing the key, reconnecting, disconnecting — and, connected, how the shop is paid: Pix, credit card with its interest-free instalments, paying on delivery or at pickup (BEELINK-203). The key is held by the field alone until it is sent, and `useConnectAsaas` keeps nothing of it past the call |
| `/[slug]/<carrinho>` | anyone; ordering asks a shopper's session | (changed by BEELINK-205) the cart's checkout reads how the shop is paid — `paymentOptionsAt`, the public lane, under `store:<slug>` — and offers Pix and credit card beside the shop's own labels: a card's instalments up to the shop's most and what the total holds, the payer's CPF while the record has none, online switched off under Asaas's least charge, a warning when the delivery fee is still to be agreed, and nothing asked when there is nothing to pay. An order charged online opens no WhatsApp and goes on to its payment screen |
| `/[slug]/<conta>/<pedidos>/[number]?pagamento=1` | the shopper whose order it is | the payment screen of an order charged online (BEELINK-205), at the order's own address as its receipt is (`?comprovante=1`): a Pix's QR and copy-and-paste code, a card's door to Asaas's page in a new tab, or why there is neither — no charge yet, expired, waiting on the delivery fee, cancelled — and what to do about it. `OrderPaymentLive` reads the shop's payment handler again while it waits for money and the tab is in sight, and on coming back to the tab; it never asks Asaas, and turns to "Pagamento aprovado" when the API says paid. An order settled with the shop is sent back to its page. The order's page and Meus pedidos say where the payment stands and lead here while there is something to pay; the page follows the charge (`OrderPaymentWatch`) and is read again when it is paid |

Both forms are `react-hook-form` inside a `packages/ui` block, and every request they need is a callback the screen hands in: the palettes, the postcode lookup and the image upload. That is what keeps `web/no-fetch-in-components` at zero while a tab still offers a button that reaches the network.

| Handler | Lane | What |
|---|---|---|
| `/api/store-color-presets` | admin | forwards the six palettes; they are served rather than shipped because `web/no-hex-colors` scans this tree |
| `/api/cep/[zipCode]` | signed in, **not** forwarded | calls ViaCEP server-side. `CEP_NOT_FOUND` and `CEP_UNAVAILABLE` are separate codes: a mistyped postcode and an outage are not the same answer, and neither blocks the save |
| `/api/uploads` | signed in | answers **501 `UPLOAD_NOT_CONFIGURED`** today. Where bytes are stored is a separate decision; when it lands it replaces this one handler and nothing above it — `uploadImage()`, the hook, the field and the sentence are finished |
| `/api/stores/[slug]/integrations/melhor-envio` | admin | the shop's Melhor Envio connection (`GET`) and disconnecting it (`DELETE`, the API's 204 answered as 200) — BEELINK-182 |
| `/api/stores/[slug]/integrations/melhor-envio/connect` | admin, **a link** | asks the API for the authorization page and sends the browser there (303), remembering the shop in `bl_integration_return` on `/api/integrations` only. Origin-checked, not JSON-checked: a followed link sends no JSON header |
| `/api/integrations/melhor-envio/callback` | admin | Melhor Envio's one fixed return address, for every shop: hands the code and the state to the API with the owner's session, then lands on `/admin/<slug>/integrations/melhor-envio?conectado=…` or `?erro=<code>` |
| `/api/integrations/asaas/webhook` | public, **not** origin-checked | Asaas telling of a shop's charge (BEELINK-206), at the webhook bee-link registers in each shop's own account: the bytes go to the API as they arrived, with `asaas-access-token` beside them and nothing else of the request. The token is the shop's — the API knows whose, and refuses a request without one; nothing here reads or logs it. An API that cannot be reached answers `502`, so Asaas delivers again |
| `/api/integrations/melhor-envio/webhook` | public, **not** origin-checked | Melhor Envio telling of a label (BEELINK-188): the bytes go to the API as they arrived, with `X-ME-Signature` beside them — the signature is over those bytes, so the body is never parsed here. The API refuses what the app did not sign |
| `/api/stores/[slug]/integrations/melhor-envio/account` · `/settings` | admin | the wallet and Melhor Envio's services, read there and then; the carrier settings (`GET`, `PUT`) — BEELINK-183 |
| `/api/stores/[slug]/integrations/asaas` | admin | the shop's Asaas connection (`GET`), connecting it with the API key the owner pasted (`POST` — the body goes to the API as it came; nothing here keeps or logs it) and disconnecting it (`DELETE`, the API's 204 answered as 200) — BEELINK-202. Asaas's own webhook route is `/api/integrations/asaas/webhook`, above. Connecting and disconnecting drop the shop window's cache (`revalidateStore`): the checkout offers what the shop charges online since BEELINK-205 |
| `/api/stores/[slug]/integrations/asaas/settings` | admin | how the shop is paid through Asaas — Pix, credit card and its instalments, paying on delivery (`GET`, `PUT`) — BEELINK-203. A save drops the shop window's cache (`revalidateStore`): the checkout reads these choices since BEELINK-205 |
| `/api/stores/[slug]/integrations/asaas/approval` | admin | asks Asaas again whether it approved the shop's account (`POST`, BEELINK-278) — the button of the notice `/admin/[slug]/integrations/asaas` shows over a connected account that is not approved, which says paying on the site is off until it is and that the shop sells as before. The checkout offers Pix and card by the answer, so a 2xx drops the shop window's cache (`revalidateStore`). The same standing changes with no write from the panel — the API's daily look, or a charge Asaas refused — and the checkout then follows when its kept answer is next read again |
| `/[slug]/api/orders/[number]/payment` | the shop's shopper | the charge of one of the shopper's orders (BEELINK-205): `GET` reads it as the bee-link API knows it — a Pix's code and QR, a card's hosted invoice, or none — and `POST` makes sure there is one good to pay ("Gerar pagamento", "Gerar novo Pix"), sending nothing of its own. Under the shop's path, where the shopper's cookies reach; origin-checked, JSON only, the session renewed on the way and the visitor's address forwarded for the API's per-address limit. The API's answer and its refusals (`PAYMENT_*`) go back as they came |
| `/api/stores/[slug]/orders/[number]/payment/seen` | admin | somebody at the shop opened a paid order (BEELINK-207): `POST` tells the API, so the bell stops telling of that payment. Nothing is sent but who asks; the API's 204 is answered as an empty 200. Origin-checked like every panel handler |
| `/api/stores/[slug]/orders/[number]/refunds` | admin | gives money back from an order (BEELINK-208): `POST` forwards the refund as it was typed — the amount, the reason, what the screen saw as left, and a stray payment's id — and hands back the order, or the API's refusal with its details (`REFUND_*`). Origin-checked like every panel handler |
| `/admin/[slug]/orders/[number]/refund` | admin | the refund's own screen (BEELINK-208), as every form has: of the order's payment, of money it did not ask for (`?stray=<id>`), or with the order's cancellation (`?cancel=1`, all that is left and only the reason asked). What is left is read from the order and sent back with the refund; a refusal is worded by `lib/order-refund-refusal.ts`, and a stale one starts the form over. `useRefundOrder`; back to the order once Asaas took it |
| `/admin/[slug]/orders` · `/admin/[slug]/orders/[number]` | admin | (changed by BEELINK-208) the list filters `?payment=REFUNDED` too and says a refund on its way; the order's payment card leads to the refund's screen, lists every refund with its reason and Asaas's refusal, and cancelling an order that holds money goes to that screen instead of the confirmation. (changed by BEELINK-207) the list filters by payment in its address (`?payment=PAID`, `PENDING`, `STRAY`) beside the status and the search, and a row of an order charged online says where its money stands. The order's page draws its online payment first in the side column — the way, the instalments, the amount, where it stands in words, when it was paid, Asaas's last refusal — and, fixed for as long as it stands, money the order did not ask for with what the shop does about it. Opening a paid order tells the API it was seen (`useMarkOrderPaymentSeen`). The bell lists paid orders nobody opened yet (`useOrders` with `PAID_UNSEEN`) and counts them; the real-time event that is a payment's news (`approved`) is a toast |
| `/[slug]/<conta>/<pedidos>/[number]` | the shopper whose order it is | (changed by BEELINK-207) an order charged online has its payment as the second step — "Pagamento aprovado" with when, or "Aguardando pagamento" — in the payment box's own words (`lib/order-steps.ts`); the history tells of the payment where it fell, the receipt (`?comprovante=1`) says whether it was paid, and the conversation words the payment's notice and a cancellation for want of payment (`lib/status-notice.ts`). An order settled with the shop reads as before. (changed by BEELINK-208) the payment box lists each refund — how much, given back or on its way — and the history tells of it (`lib/order-refund-view.ts`); the payment's step reads "Pagamento estornado" once all of it went back; a paid order says its cancel is the shop's to do; an order bee-link cancelled says "por falta de pagamento"; and the conversation words a refund's notice with its amount |
| `/api/page-templates` | admin | the models the home of a store **not created yet** may open with — `?storeType=`, and `?categoryId=` to order the suggested ones; an empty value is left out (BEELINK-266). Beside `stores`, like `store-categories`: no shop to key it by. A read: nothing is revalidated. `components/store/store-create-screen.tsx` is its one caller |
| `/api/stores/[slug]/page-templates` · `/[templateId]/preview` | admin | the models a page of the shop may be arranged with (`?pageId=`), or a page about to be made (`?kind=LANDING`, what "Nova landing" lists — `components/design/new-landing.tsx`, BEELINK-266), and one of them as it would look there, from the shop's own products (`?pageId=`, `?productId=`, `?categoryId=`; an empty value is left out) — BEELINK-263. Reads: nothing is revalidated. Design mode's gallery of models (`components/design/page-templates.tsx`, opened from the bar's "Modelos") is their one caller |
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
