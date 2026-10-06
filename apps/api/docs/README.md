# apps/api — surface map

> Facts about this workspace. Rules live in [../AGENTS.md](../AGENTS.md).

## Layout

```
src/
├── main.ts                     # Fastify · pino · helmet · CORS · validation · Swagger
├── app.module.ts               # JwtAuthGuard is registered globally here
├── app.setup.ts                # the request pipeline and the Fastify adapter, shared with the e2e tests
├── health.controller.ts
├── generated/prisma/           # `prisma generate` output — gitignored, never edited
├── modules/
│   ├── auth/                   # register · verify · login · refresh · logout · reset
│   │   ├── auth.constants.ts   # the product's TTLs, as decisions rather than configuration
│   │   ├── auth.tokens.ts      # opaque token + SHA-256
│   │   ├── email-token.service.ts
│   │   ├── session.service.ts  # sessions, rotation, reuse detection
│   │   └── jwt-auth.guard.ts
│   ├── stores/                 # the shop: the panel's writes and the storefront's one read
│   │   ├── stores.controller.ts            # create · mine · public · by slug · update
│   │   ├── stores.service.ts               # assertOwnership() — the rule the legacy left to RLS
│   │   ├── stores.constants.ts             # reserved slugs · the closed unions · the bounds
│   │   ├── store.mapper.ts                 # row → PublicStore / Store, and the layout blob
│   │   ├── store-layout-settings.schema.ts # validates the one blob that stays a blob
│   │   ├── store-geocoder.service.ts       # the outbound address lookup, server-side
│   │   ├── store-categories.{controller,service}.ts   # the platform's taxonomy of shops
│   │   ├── store-color-presets.{controller,constants}.ts  # the six palettes, as data
│   │   └── dto/                            # bodies in, Swagger shapes out
│   ├── delivery/               # how a shop gets an order out: the rules (pickup, own delivery by distance bands, carriers) and their quote to an address
│   ├── integrations/           # a shop's own accounts at Melhor Envio and Asaas: the sealed vault; Melhor Envio's OAuth flow and renewal routine; `asaas/` — the pasted key, checked and sealed, the shop's webhook, how the shop is paid through it, and its charges by the shop's id (`AsaasCharges`, the one place the key is opened to charge, which also remembers a 429 until the time Asaas named); whose webhook a request is (`AsaasWebhookDoor`) and the daily look that keeps a shop's webhook sending and its key in use (`AsaasWebhookKeeper`); `meta-pixel/` — the shop's Meta Pixel by its ID alone (BEELINK-269), digits only, public and so never sealed, served in the shop's public data
│   ├── payments/               # an order charged online at the shop's own Asaas account: the claim that lets one request at a time talk to Asaas, the charge found again by the order's id before any is made, the status map, the due days and Asaas's least amounts — no key in sight (`integrations/asaas/` opens it); `PaymentSync`, the one way a payment is learned of: the order's charges listed at the shop's account and written by `applyCharge`, whoever asked — and money the order did not ask for kept as a stray payment; the news of a payment approved (BEELINK-207), owed once an order where the payment is written — its e-mail outbox (`OrderPaidMailer`), the line in the conversation, what the bell reads — and the list's filter by where the money stands; `OrderRefunds` (BEELINK-208), the one talk with Asaas about a refund — claimed under the shop's lock, asked once, read after a silence — with `order_refunds` as bee-link's own record of each, reconciled from Asaas's sums by `applyCharge` and the source of what `order_payments` says of money given back, and the refund's e-mail outbox (`OrderRefundMailer`)
│   ├── payment-events/         # what Asaas tells of a payment, and what the clock does about one (BEELINK-206): the shop's webhook — each event written once, answered, then worked with retries — the reconciliation of waiting charges, the cancellation of an order nobody paid, and the one routine that runs them every minute. The only module that knows payments and orders both
│   └── users/                  # GET /users/me
└── shared/
    ├── config/env.ts           # the only reader of process.env
    ├── http/                   # ApiExceptionFilter — every error leaves as ApiErrorBody
    ├── mail/                   # nodemailer over SMTP, pt-BR templates
    ├── prisma/                 # PrismaService + PrismaModule
    └── swagger/                # setupSwagger()
prisma/schema/                  # one *.prisma per domain — a new domain adds a file, never edits one
├── base.prisma                 # generator · datasource — the one pair Prisma allows
├── auth.prisma                 # users · sessions · refresh_tokens · email_tokens
└── store.prisma                # store_categories · stores, and the three enums they close over
prisma/seed/                    # platform data, re-runnable — `migrations.seed` in prisma.config.ts
└── store-categories.sql        # upserts the taxonomy on slug; `pnpm --filter api db:seed`
test/                           # e2e against real Postgres and Mailpit
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
| `JWT_SECRET` | — | required, 32 characters or more; signs the access token |
| `SMTP_URL` | `smtp://localhost:1025` | Mailpit in development |
| `MAIL_FROM` | `bee-link <nao-responda@bee-link.local>` | |
| `WEB_URL` | `http://localhost:3000` | where the links in e-mails point |
| `AUTH_RATE_LIMIT_MAX` | `5` | per IP, per window, on the unauthenticated auth routes |
| `AUTH_RATE_LIMIT_WINDOW` | `1 minute` | |
| `STORE_WRITE_RATE_LIMIT_MAX` | `20` | per IP, per window, on `POST /stores` and `PUT /stores/:slug` |
| `STORE_WRITE_RATE_LIMIT_WINDOW` | `1 minute` | |
| `TRUST_PROXY` | `loopback` | whose `x-forwarded-for` is believed |
| `MELHOR_ENVIO_ENV` | `sandbox` | `sandbox` · `production` — which Melhor Envio the app talks to |
| `MELHOR_ENVIO_CLIENT_ID`, `MELHOR_ENVIO_CLIENT_SECRET`, `MELHOR_ENVIO_REDIRECT_URI` | — | bee-link's app at Melhor Envio; all three or none, and then `INTEGRATIONS_SECRET_KEY` too |
| `MELHOR_ENVIO_CONTACT_EMAIL` | `contato@beecoders.net` | sent in the `User-Agent`, which Melhor Envio requires |
| `ASAAS_ENV` | `sandbox` | `sandbox` · `production` — which Asaas a shop's key is for; a key of the other one is refused |
| `ASAAS_CONTACT_EMAIL` | `contato@beecoders.net` | sent in the `User-Agent`, which Asaas requires; also where Asaas warns of a shop's paused webhook |
| `INTEGRATIONS_SECRET_KEY` | — | 32 bytes in base64; seals each shop's third-party access (`modules/integrations/secret-vault.ts`) |

## Endpoints

Every route needs `Authorization: Bearer <access token>` unless it is marked public. Errors always answer `{ statusCode, errorCode, message }`; clients switch on `errorCode`.

| Verb | Path | Public | What | Answers |
|---|---|---|---|---|
| `GET` | `/api/health` | yes | liveness — does not touch the database | `200` |
| `POST` | `/api/auth/register` | yes | create an account, e-mail the verification link | `201` · `409 AUTH_EMAIL_TAKEN` |
| `POST` | `/api/auth/verify-email` | yes | verify with the link's token | `204` · `400 AUTH_TOKEN_INVALID` |
| `POST` | `/api/auth/resend-verification` | yes | send the link again | `202`, for any address |
| `POST` | `/api/auth/login` | yes | open a session | `200 AuthSession` · `401 AUTH_INVALID_CREDENTIALS` · `403 AUTH_EMAIL_NOT_VERIFIED` |
| `POST` | `/api/auth/refresh` | yes | rotate the refresh token | `200 AuthSession` · `401 AUTH_TOKEN_INVALID` · `401 AUTH_REFRESH_REUSED` |
| `POST` | `/api/auth/logout` | yes | end this device's session | `204`, idempotent |
| `POST` | `/api/auth/forgot-password` | yes | e-mail a reset link | `202`, for any address |
| `POST` | `/api/auth/reset-password` | yes | set a new password, end every session | `204` · `400 AUTH_TOKEN_INVALID` |
| `GET` | `/api/users/me` | no | the signed-in person | `200 User` · `401 AUTH_UNAUTHENTICATED` |
| `POST` | `/api/stores` | no | open a shop — claims the slug, which never changes. `template` (`OpeningTemplateId`) is the model its home opens with, published with the store: a site's, or one of a shop's four home models, arranged as on a shop with nothing on its shelf (`store-opening.ts`, BEELINK-266). Absent — or not for the store's type — a shop opens with its default page and a site with `servicos-b2b` | `201 Store` · `400 STORE_SLUG_RESERVED` · `409 STORE_SLUG_TAKEN` · `404 STORE_CATEGORY_NOT_FOUND` |
| `GET` | `/api/stores/mine` | no | the signed-in shopkeeper's shops, newest first | `200 Store[]` |
| `GET` | `/api/stores/:slug/public` | yes | the shop window — the narrow storefront shape, with `metaPixelId`, the shop's Meta Pixel ID or null (BEELINK-269) | `200 PublicStore` · `404 STORE_NOT_FOUND` |
| `GET` | `/api/stores/:slug` | no | the shop as its owner edits it | `200 Store` · `403 STORE_FORBIDDEN` · `404 STORE_NOT_FOUND` |
| `PUT` | `/api/stores/:slug` | no | replace what the panel edits — a full body, not a patch | `200 Store` · `400` on `slug`/`latitude`/`longitude` · `403 STORE_FORBIDDEN` · `404 STORE_NOT_FOUND` |
| `GET` | `/api/store-categories` | no | the platform's taxonomy of shops, by name | `200 StoreCategory[]` |
| `GET` | `/api/store-color-presets` | no | the six palettes the panel applies in one click | `200 StoreColorPreset[]` |
| `GET` | `/api/stores/:slug/page-templates` | no | the models a page may be arranged with — the home unless `?pageId=`, or a page about to be made with `?kind=LANDING` ("Nova landing" reads this, and no page is read for it; BEELINK-266) — narrowed to the page's kind and the store's type, the ones suggested for the shop's category first, each with what it asks for (a product, a category). A shop's home is offered four, filled from the shop itself and asking for nothing: `vitrine-com-capa`, `por-categorias`, `ofertas`, `catalogo-enxuto`. It lists; it arranges nothing and returns no bands | `200 PageTemplateSummary[]` · `403 STORE_FORBIDDEN` · `404 PAGE_NOT_FOUND` (`400` when `pageId` is not a uuid) |
| `GET` | `/api/page-templates` | no | the models the home of a store **not created yet** may open with (BEELINK-266): `?storeType=` (required; `400 PAGE_TEMPLATE_UNAVAILABLE` for a type that is none) and `?categoryId=`, the category picked in the create form, which only orders the answer — one that names no row suggests nothing. Signed in, scoped by no shop. The same `PageTemplateSummary[]`, from the same `templatesFor` |
| `GET` | `/api/stores/:slug/page-templates/:id/preview` | no | a model as it would look on a page — the home unless `?pageId=` — built around `?productId=` or `?categoryId=` when it asks: the bands applying it would leave, resolved as a visitor would be served them, from today's catalogue. **Nothing is written**, and the draft's revision does not move. Refused where applying is, by the same codes. The ids of its bands and blocks name no row | `200 PagePreview` · `400 PAGE_TEMPLATE_UNAVAILABLE` (not a model, or not one for this kind of store or page) · `400 PAGE_PRODUCT_REQUIRED` · `400 PAGE_PRODUCT_INVALID` · `400 PAGE_CATEGORY_REQUIRED` · `400 PAGE_CATEGORY_INVALID` · `403 STORE_FORBIDDEN` · `404 PAGE_NOT_FOUND` (`400` when `pageId` is not a uuid) |
| `POST` | `/api/stores/:slug/pages/:pageId/apply-template` | no | a model's bands written over the page's **draft**, which they replace — `ApplyTemplatePayload`: the model and, when it asks, `productId` or `categoryId`. It publishes nothing: what a visitor is served, the page's status and its SEO stay as they were. One transaction under the shop's lock; `x-page-revision` is checked like any write of the draft. On the home the strip above the header is kept, and a shop that sells ends with a showcase; a contact form keeps its id, so its leads stay linked | `200 PageDraft`, one revision on · `400 PAGE_TEMPLATE_UNAVAILABLE` (not a model, or not one for this kind of store or page) · `400 PAGE_PRODUCT_REQUIRED` · `400 PAGE_PRODUCT_INVALID` · `400 PAGE_CATEGORY_REQUIRED` · `400 PAGE_CATEGORY_INVALID` · `403 STORE_FORBIDDEN` · `404 PAGE_NOT_FOUND` · `409 PAGE_DRAFT_STALE` |
| `GET` | `/api/stores/:slug/integrations/melhor-envio` | no | the shop's Melhor Envio connection, and whether this deployment can make one | `200 MelhorEnvioConnection` · `403 STORE_FORBIDDEN` |
| `POST` | `/api/stores/:slug/integrations/melhor-envio/authorize` | no | Melhor Envio's authorization page, with a ten-minute state for this person and shop | `200 IntegrationAuthorization` · `503 INTEGRATION_UNAVAILABLE` |
| `POST` | `/api/integrations/melhor-envio/callback` | no | the code traded for the tokens, sealed; only the person who began the flow | `200 MelhorEnvioConnected` · `400 INTEGRATION_STATE_INVALID` · `400 INTEGRATION_EXCHANGE_FAILED` · `502 INTEGRATION_UNREACHABLE` |
| `DELETE` | `/api/stores/:slug/integrations/melhor-envio` | no | disconnect: the tokens are deleted | `204` |
| `GET` | `/api/stores/:slug/integrations/melhor-envio/account` | no | the wallet's balance and Melhor Envio's services, read there and then with the shop's token | `200 MelhorEnvioAccountOverview` · `409 INTEGRATION_NOT_CONNECTED` · `409 INTEGRATION_NEEDS_RECONNECT` · `502 INTEGRATION_UNREACHABLE` |
| `GET` · `PUT` | `/api/stores/:slug/integrations/melhor-envio/settings` | no | the services offered, the days to post, the default parcel and the shop as the labels' sender (CPF or CNPJ, state registration) — every service until first saved | `200 MelhorEnvioSettings` · `400 MELHOR_ENVIO_SETTINGS_INVALID` |
| `GET` · `POST` · `DELETE` | `/api/stores/:slug/orders/:number/label` | no | an order's shipping label from the shop's own Melhor Envio wallet: what buying one needs, the wallet and the box Melhor Envio would pack it in; buy — into the cart, paid from the balance, generated, its tracking on the order — carrying on from where it stopped; cancel while Melhor Envio allows it | `200 OrderLabelOverview` · `400 LABEL_INVALID` · `409 LABEL_NOT_AVAILABLE` · `409 LABEL_BALANCE_INSUFFICIENT` · `409 LABEL_REFUSED` · `409 LABEL_NOT_CANCELLABLE` · `502 INTEGRATION_UNREACHABLE` |
| `POST` | `/api/integrations/asaas/webhook` | yes | Asaas telling of a shop's charge, or of its account's keys (BEELINK-206), at the webhook bee-link registered in the shop's own account. The shop is found by the SHA-256 of `asaas-access-token` and the token compared in constant time with the one sealed for it; the header is redacted from the logs. The event is written — once per shop and event id — before the 200, and worked afterwards, with retries: its body is never applied, it only names the order whose charges are then read at the shop's account. A second delivery, a charge the shop made outside bee-link and a body nobody can read all answer 200 | `200 { result: RECORDED · DUPLICATE · IGNORED }` · `401 INTEGRATION_SIGNATURE_INVALID` |
| `POST` | `/api/integrations/melhor-envio/webhook` | yes | Melhor Envio telling of a label: posted moves the order out for delivery, delivered delivers it — forward only, by the carrier — with its tracking; a cancelled label is mirrored. Signed with the app's secret (`X-ME-Signature`); once per label and status | `200 { result }` · `401 INTEGRATION_SIGNATURE_INVALID` |
| `POST` | `/api/stores/:slug/orders/:number/label/print` | no | the generated label's PDF, at a public address made there and then | `200 OrderLabelPrint` · `404 LABEL_NOT_FOUND` · `409 LABEL_NOT_GENERATED` |
| `GET` · `POST` · `DELETE` | `/api/stores/:slug/integrations/asaas` | no | the shop's own Asaas account: whose it is (document masked) and its webhook's state — never the key; connect, or replace, with the API key the owner pastes — refused by its prefix when it is the other environment's, checked at Asaas, sealed, and the shop's webhook registered at its account (skipped where the web is not public https), under the auth routes' per-IP limit; disconnect — the webhook removed, the key deleted | `200 AsaasConnection` · `204` · `400 INTEGRATION_KEY_INVALID` · `400 INTEGRATION_KEY_WRONG_ENVIRONMENT` · `403 STORE_FORBIDDEN` · `429` · `502 INTEGRATION_UNREACHABLE` · `503 INTEGRATION_UNAVAILABLE` |
| `GET` · `PUT` | `/api/stores/:slug/integrations/asaas/settings` | no | how the shop is paid once its Asaas is connected: Pix, credit card and in up to how many instalments (1 to 12, interest-free to the customer; 1 is in full), and paying on delivery or at pickup — at least one of the three on. Pix and card in full plus paying on delivery until first saved. A row of the shop's own, apart from the connection: read and saved connected or not, and kept across connecting again and disconnecting | `200 AsaasSettings` · `400 ASAAS_SETTINGS_INVALID` · `403 STORE_FORBIDDEN` |
| `GET` · `POST` | `/api/stores/:slug/customer/orders/:number/payment` | no — a shopper's token | the charge of one of the shopper's orders at the shop's own Asaas account (BEELINK-204), with what it is paid with — a Pix's code and QR, read from Asaas once and kept, or a card's hosted invoice; null for an order settled with the shop and for one with no charge yet. `POST` makes sure it has one good to pay: the one it has while that serves, else a new one, whatever stood before removed from Asaas first — by one request at a time, and after looking at Asaas for a charge already made for the order. Under the per-IP limit of the cart's orders, in a bucket of its own | `200 CustomerOrderPaymentAnswer` · `404 ORDER_NOT_FOUND` · `409 PAYMENT_NOT_ONLINE` · `409 ORDER_CANCELLED` · `409 PAYMENT_AWAITING_TOTAL` · `409 PAYMENT_ALREADY_PAID` · `409 PAYMENT_IN_PROGRESS` · `409 PAYMENT_BELOW_MINIMUM` · `409 PAYMENT_DOCUMENT_MISSING` · `429` · `502 PAYMENT_REFUSED` · `503 PAYMENT_UNAVAILABLE` |
| `GET` | `/api/stores/:slug/payment-options` | no | how the shop's checkout is paid (BEELINK-205), read by anyone and from the acceptance an order is placed against: what it charges online now — Pix, credit card and its most instalments, with Asaas's least charge and least instalment — and whether paying on delivery stands. A shop with no Asaas in good standing (never connected, disconnected, to be reconnected) answers `online: null` and `offline: true`. Nothing of the account travels. Under the storefront's per-IP limit | `200 StorefrontPaymentOptions` · `404 STORE_NOT_FOUND` · `429` |
| `POST` | `/api/stores/:slug/customer/orders` | no — a shopper's token | (changed by BEELINK-204) takes `paymentChannel` — absent is `OFFLINE`, the shop's own labels as before, refused once a connected shop turned paying on delivery off — and `installments`. `ONLINE` is Pix or credit card of a shop whose Asaas is connected and takes it, needs the customer's CPF (`recipientDocument` when the record has none), and is charged after the order commits: Asaas failing answers the order without a charge. A fee not agreed yet is charged once the shop tells it. An `OFFLINE` order with nothing to pay — a closed total of zero — is taken even where paying on delivery is off (BEELINK-205): it cannot be charged | `201 CustomerOrder` · `400 ORDER_PAYMENT_NOT_ACCEPTED` · `400 ORDER_PAYER_DOCUMENT_MISSING` · `409 ORDER_PAYMENT_BELOW_MINIMUM` |
| `GET` | `/api/stores/:slug/customer/orders/:number/payment` | no — a shopper's token | (changed by BEELINK-206) reading a charge still waiting asks Asaas of it, at most once a minute a charge, counted from the last time Asaas was heard about it by any way; Asaas failing answers what bee-link knows | — |
| `GET` | `/api/stores/:slug/orders/:number` | no | (changed by BEELINK-206) `payment.strays` lists money at the shop's Asaas account that the order did not ask for — paid after the order was cancelled, or a second payment — which bee-link never refunds on its own | — |
| `DELETE` · `POST` | `/api/stores/:slug/integrations/asaas` | no | (changed by BEELINK-206) disconnecting, and connecting another account, first take the shop's waiting charges out of the account being left, for up to 20 seconds and never failing; the same account under a new key keeps them | — |
| `POST` | `/api/stores/:slug/integrations/asaas/approval` | no | Asaas asked again, now, whether it approved the shop's account (BEELINK-278), answering the connection as it then stands. The connection carries `approval` — Asaas's `general` of `GET /v3/myAccount/status`: `PENDING`, `AWAITING_APPROVAL`, `APPROVED`, `REJECTED`, or null while not known — and `approvalCheckedAt`. It is read when the shop connects, once a day beside the webhook, on this route, and when Asaas refuses a charge. An account read as not `APPROVED` is not `connected` to `AsaasAcceptance`: `payment-options` answers `online: null, offline: true` and an online order is refused `ORDER_PAYMENT_NOT_ACCEPTED`, by the one reading. Not known switches nothing off. `502 INTEGRATION_UNREACHABLE` when Asaas does not answer, which changes nothing kept; rate-limited as connecting is |
| `GET` · `POST` · `DELETE` | `/api/stores/:slug/integrations/meta-pixel` | no | the shop's Meta Pixel (BEELINK-269): its ID and when it was saved; save it, or replace the one saved, with `{ pixelId }` — 10 to 20 ASCII digits, the spaces around it dropped and nothing else mended, never a script, since shops share one domain; and remove it. The ID is public, so nothing is sealed and no `INTEGRATIONS_SECRET_KEY` is needed; Meta is asked nothing. A row of `store_integrations` (`META_PIXEL`) with the ID in `pixelId`, which a CHECK keeps to digits | `200 MetaPixelConnection` · `204` · `400 META_PIXEL_ID_INVALID` · `403 STORE_FORBIDDEN` |
| `POST` · `PATCH` · `PUT` | `/api/stores/:slug/customer/orders/:number/cancel` · `/api/stores/:slug/orders/:number/status` · `/api/stores/:slug/orders/:number/delivery-fee` | no | (changed by BEELINK-204) cancelling removes a waiting charge from Asaas after the commit, and so does a fee that changes the total; Asaas failing to remove it is kept on the charge and undoes nothing. A paid order's fee is not changed, nor is it cancelled by its customer; the shop's `PATCH …/status` to `CANCELLED` takes `refund` (`reason`, `refundableCents`) and asks Asaas for the refund of all that is left **before** the order is cancelled (BEELINK-208) — refused, the order stays as it was | `409 ORDER_PAID` (a paid order cancelled without `refund`) · and what `POST …/refunds` is refused with |
| `POST` | `/api/stores/:slug/orders/:number/refunds` | no | money of the order's payment given back (BEELINK-208), whole or in part, or a payment it did not ask for (`strayId`): `amountCents`, `reason`, and `refundableCents` — what the screen saw as left, so a second tab is refused rather than made twice. One refund a charge is asked of Asaas at a time, always with its amount; a silence is followed by a read of the charge before anything else is asked. Answers the order | `200 Order` · `409 REFUND_NOTHING_TO_REFUND` · `REFUND_EXCEEDS` · `REFUND_STALE` · `REFUND_IN_PROGRESS` · `REFUND_NOT_READY` · `502 REFUND_NO_BALANCE` · `REFUND_REFUSED` · `503 REFUND_UNCONFIRMED` · `PAYMENT_UNAVAILABLE` |
| `GET` | `/api/stores/:slug/orders` | no | (changed by BEELINK-207) takes `payment`, beside `status` and `q`: `PAID` holds the customer's money, `PENDING` is charged online, not cancelled and never paid, `STRAY` has money it did not ask for and the shop has not given back yet, `REFUNDED` had money given back or has it on its way (BEELINK-208), and `PAID_UNSEEN` is paid and not opened by the shop since — what the panel's bell reads. Each row carries its charge's `paidAt` and how many `strays` it has | `200 OrderPage` · `400` on a `payment` it does not know |
| `POST` | `/api/stores/:slug/orders/:number/payment/seen` | no | somebody at the shop opened a paid order (BEELINK-207): the bell stops telling of its payment (`Order.payment.unseen`). Seen is the shop's, not a person's; saying it again, or of an order nobody paid, changes nothing | `204` · `404 ORDER_NOT_FOUND` |
| `GET` | `/api/stores/:slug/orders/:number/conversation` · `/api/stores/:slug/customer/orders/:number/conversation` · the two lists | no — each side's own token | (changed by BEELINK-207) a conversation tells of a payment approved in a line of its own (`kind: PAYMENT`), once an order, unread for the customer; and a cancellation bee-link made for want of payment says so (`unpaid: true` on the `STATUS` notice). The customer is e-mailed of the payment too — once an order, from the `order_paid_notices` outbox, to a confirmed address that kept order notices on — and the cancellation's e-mail says why. A refund Asaas took is a line too (`kind: REFUND`, with its amount), and an e-mail — once a refund, from the `order_refund_notices` outbox (BEELINK-208). The customer's order carries `payment.refunds` (only those Asaas took) and `cancelledBy: SYSTEM` for bee-link's own cancellation | — |
| `GET` · `PUT` | `/api/stores/:slug/delivery` | no | pickup, the shop's own delivery by distance bands (the last band is the radius), free above, carriers — the defaults until first saved | `200 DeliverySettings` · `400 DELIVERY_SETTINGS_INVALID` |
| `POST` | `/api/stores/:slug/delivery/quote` | no | the panel's quote for a sale it registers: drafts included | `200 ShippingQuote` · `400 SHIPPING_DESTINATION_INVALID` · `403 STORE_FORBIDDEN` |
| `POST` | `/api/stores/:slug/shipping/quote` | yes | the shop window's ways to get a cart to an address — own delivery by straight-line distance to the geocoded address (MapTiler, else Nominatim; remembered by CEP and number), the carriers of the shop's Melhor Envio (its token, its services, its days to post; remembered ten minutes per cart; left out, never failing, when Melhor Envio does not answer in 4 s), then pickup | `200 ShippingQuote` · `400 SHIPPING_DESTINATION_INVALID` · `400 ORDER_VARIANT_INVALID` · `404 STORE_NOT_FOUND` · `429` |

`GET /api/stores/mine` is declared above `GET /api/stores/:slug`: Nest matches in declaration order, and `mine` is on the reserved-slug list so no shop can occupy it either.

Ownership is explicit code, not a database policy: `StoresService.assertOwnership()` is the single gate every owner-facing read and every write passes through. A shop owned by somebody else answers **403**, not 404 — `/<slug>` is a public storefront, so its existence leaks nothing.

Rate limited per IP, all answering `429 RATE_LIMITED`: register, login, forgot-password and resend-verification; `POST /api/stores` and `PUT /api/stores/:slug`, because each can drive an outbound geocoding call this API waits up to four seconds on; and `GET /api/stores/:slug/public`, generously — every browser reaches it through the web app's server, so the limit sees one address for the whole storefront. The key is the address only because `TRUST_PROXY` lets the web app forward it: the plugin runs in Fastify's `onRequest`, before `JwtAuthGuard` has decoded the token, so there is no owner to key on.

Nothing caps how many shops one owner may open. The rate limit bounds the rate, not the total.

`store_categories` and the six colour presets are both platform data, and they are kept differently on purpose. The taxonomy is a table, because a shop points at a row of it, and it is seeded by [`prisma/seed/store-categories.sql`](../prisma/seed/store-categories.sql) — `pnpm --filter api db:seed`, or automatically by `prisma migrate dev`. The presets are a constant in the module, because nothing references a preset: applying one writes its four colours onto the shop, and the shop keeps the colours, not the choice. They are served rather than shipped as source because `web/no-hex-colors` scans `apps/web/src` and `packages/ui/src`, and twenty-four colour literals in either tree are the exact thing that gate exists to stop.

Swagger documents all of it at `/api/docs`, with an Authorize button that holds a bearer token. `@ApiBearerAuth()` goes on a handler, never on a controller class that also holds a `@Public()` route — on the class it marked the anonymous storefront read as needing a token.

## Tests

| Command | What it does |
|---|---|
| `pnpm turbo test --filter=api` | unit tests, after `prisma generate` — `pnpm --filter api test` alone uses the client already generated |
| `pnpm --filter api test:e2e` | e2e against real Postgres and Mailpit — needs `pnpm stack:up` |

The e2e suites run against `harness_test`, created and migrated on demand; the reset helper refuses any database whose name does not end in `_test`.

## Adding a module

`pnpm --filter api exec nest g resource modules/<name>`, then shape it to rule 5 of the contract.
