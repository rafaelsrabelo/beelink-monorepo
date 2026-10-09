# Deploy — Dokploy

> **Tier:** repo — true for these apps whatever the business. See [the tier map](../README.md).

Production is one Docker Compose stack on a Dokploy server: [docker-compose.dokploy.yml](../../docker-compose.dokploy.yml), built from [docker/](../../docker/api.Dockerfile) on the server itself. The root `docker-compose.yml` stays the development stack; the two never share a file.

## What runs

| Service | Image | Network | Why it is shaped this way |
|---|---|---|---|
| `postgres` | `postgres:18-alpine` | internal | the seed calls `uuidv7()`, which exists from 18; `pg_trgm` and `unaccent` ship in its contrib |
| `migrate` | the API's `build` stage | internal | `prisma migrate deploy`, then the store-categories seed, then it exits — `exited` is its healthy state |
| `api` | the API's `runtime` stage | internal + `dokploy-network` | **one public route**: the real-time socket at `/api/socket.io` on the web's domain ([realtime.md](realtime.md)). Every other call goes through the web's route handlers |
| `web` | Next.js `standalone` | internal + `dokploy-network` | the only thing Traefik can see; serves the shop windows at `/<slug>` and the panel at `/admin/<slug>` |

One domain, `WEB_DOMAIN`. The API needs none of its own: the socket rides the web's domain, so Swagger, CORS and a second certificate are not a production concern. `NEXT_PUBLIC_REALTIME_URL` is set from it at build time.

## First deploy

1. Point an `A` record for `WEB_DOMAIN` at the server **before** deploying — Let's Encrypt validates over HTTP on the first request.
2. In Dokploy: a project, then a **Compose** service from the Git repository, branch `main`, compose path `docker-compose.dokploy.yml`.
3. Paste [.env.dokploy.example](../../.env.dokploy.example) into **Environment** and fill in the required block. Leave every unused optional variable **commented out**.
4. The routing lives in the file's Traefik labels. Do not add the same host again in Dokploy's **Domains** tab — two routers for one host is a collision, and one of them loses.
5. Deploy. `migrate` runs and exits, then `api` turns healthy, then `web` answers.

The server builds both images. `next build` needs roughly 2 GB of memory on its own; on a smaller machine, add swap before the first deploy rather than debugging an OOM-killed build.

## Every deploy after

A push to `main` and a redeploy (manual, or Dokploy's webhook). `migrate` runs on every deploy, so a merged migration reaches the database before the code that reads it; if it fails, the new API does not start on a schema it cannot read — the deploy fails in Dokploy's log instead.

## E-mail

Confirming an account and resetting a password travel by e-mail, and nothing else in the product works without the first one.

- **The sender's domain is verified.** The address in `MAIL_FROM` sits on a domain whose SPF, DKIM and DMARC records the provider published. Without them the messages land in spam, and a DMARC policy of `quarantine` sends anything that fails it there. A shop's e-mail keeps this address and goes out under the shop's name.
- **The password in `SMTP_URL` is percent-encoded** (`encodeURIComponent`) unless it is letters and digits only, and a mailbox login writes its `@` as `%40`. A raw `?` ends the URL, and the API refuses the environment at boot ("Invalid URL at SMTP_URL"). A raw `$` is read by Compose as a variable, and the password arrives changed with no error anywhere.
- **The boot log says whether the login works.** In production the API asks the provider once, as it starts. It logs `SMTP took the login` or `SMTP refused the connection or the login`, with the provider's reply: `EAUTH`/`535` is the user or the password, and `ECONNREFUSED`/`ETIMEDOUT` is the host or the port. A send that fails later is logged as `Could not send e-mail`, and it never fails the request that caused it.
- **Checking a login without sending anything**, from `apps/api` with the URL in `SMTP_URL`: `node -e 'require("nodemailer").createTransport(process.env.SMTP_URL).verify().then(() => console.log("ok"), (e) => console.log(e.code, e.response))'`.
- **After the first deploy, check delivery by hand:** a shopkeeper signing up, a customer signing up at a shop, and a password reset, each in a Gmail inbox and an Outlook one — in the inbox, not in spam.

## Melhor Envio

bee-link has **one app** at Melhor Envio, and each shop authorizes it on its own account (BEELINK-182): the labels are bought with the shop's wallet, under its document. The app is created in Melhor Envio's panel, **Integrações → Área Dev.**, once in the sandbox (`sandbox.melhorenvio.com.br`) and once in production, and production needs Melhor Envio's homologation (`novosnegocios@melhorenvio.com`, BEELINK-181).

- **The callback is registered exactly** as `https://<WEB_DOMAIN>/api/integrations/melhor-envio/callback`, the same value as `MELHOR_ENVIO_REDIRECT_URI`. Any difference and Melhor Envio answers `Client invalid` before the shopkeeper sees its page.
- **The webhook is registered once per app**, in the same **Área Dev. → Novo Webhook**, as `https://<WEB_DOMAIN>/api/integrations/melhor-envio/webhook` (BEELINK-188). Melhor Envio signs it with the app's secret, so it is the same `MELHOR_ENVIO_CLIENT_SECRET`; a request it did not sign is answered 401. Without the webhook, an order still moves on, only later: the API asks Melhor Envio for every generated label's tracking every 30 minutes. Melhor Envio asks the address as it registers it, with a request that is not a `POST`; the route answers it with an empty 200, and a 405 there is the registration refused as `E-WBH-0002`.
- **`MELHOR_ENVIO_ENV` and the app go together.** The sandbox app's id and secret with `sandbox`, the production app's with `production`; a sandbox shop's tokens mean nothing in production, so switching disconnects nothing on its own — each shop connects again.
- **`INTEGRATIONS_SECRET_KEY` is set once and kept.** It seals every shop's tokens. A new key, or a lost one, leaves the stored tokens unreadable, and every shop has to connect again. Keep it out of any backup that travels with the database.
- **The credentials live in Dokploy's Environment**, never in the repository.

## Asaas

bee-link has **no app** at Asaas: each shop pastes its own account's API key (BEELINK-202), the charges are created in that account, and the money never passes through bee-link. The key is sealed under the same `INTEGRATIONS_SECRET_KEY`, so connecting needs it set.

- **`ASAAS_ENV=production` in production.** It defaults to `sandbox`, where nothing is really charged. It decides the address (`api.asaas.com` or `api-sandbox.asaas.com`) and which keys a shop may paste: `$aact_prod_…` in production, `$aact_hmlg_…` in the sandbox. Switching it disconnects nothing on its own; each shop connects again with a key of the new environment.
- **`ASAAS_CONTACT_EMAIL`** names bee-link in the `User-Agent`, which Asaas requires, and is the address Asaas warns when a shop's webhook queue pauses. It defaults to `contato@beecoders.net`.
- **The webhook is registered by bee-link, one per shop**, in the shop's own account, when it connects: `https://<WEB_DOMAIN>/api/integrations/asaas/webhook`, built from `WEB_URL`. Nothing is registered by hand. With a `WEB_URL` that is not public https (development) none is registered, and payments are found by the reconciliation alone.
- **The receiver ships with the connection.** A webhook registered with nobody answering it fails, and Asaas pauses its queue after 15 failures in a row: that is why BEELINK-202 (connecting) waited for BEELINK-206 (the receiver), and why the whole stack of the epic reaches `main` together. With BEELINK-206 in, connecting is safe to deploy.
- **The webhook's address must reach the web from outside.** `POST https://<WEB_DOMAIN>/api/integrations/asaas/webhook` is public, carries no session and is not origin-checked; the web hands it to the API over the internal network. Anything in front of the web — Traefik, a WAF, a rate limit — must let Asaas's `POST` through with its `asaas-access-token` header and its body untouched. After the first shop connects, check it: Asaas's panel (Integrações → Webhooks) shows the webhook "bee-link (<slug>)" with no interrupted queue, and `asaas_events` gains a row at the shop's first payment.
- **Nothing needs a cron.** The API's own clock runs every minute (`PaymentRoutine`): events that failed are tried again, waiting charges are asked about at Asaas — each less and less often — an order charged online and unpaid three days after its total closed is cancelled once Asaas was heard to hold no payment for it, and each connected shop's webhook is read once a day, which resumes a paused queue and keeps the key in use (Asaas disables one left idle for three months). More than one API replica is fine: rows are claimed, and every write is idempotent.
- **An account Asaas has not approved connects, and charges nothing** (BEELINK-278). Its key is good, and Asaas refuses every Pix and card of it (`invalid_billingType`, "sua conta precisa estar aprovada"). bee-link reads the verdict — `general` of `GET /v3/myAccount/status` — when the shop connects, on the daily look, when the shopkeeper presses "Verificar de novo" in Integrações → Asaas, and when Asaas refuses a charge; it is kept in `store_integrations.accountApproval`. Read as anything but `APPROVED`, the panel says so and the checkout offers no online payment: the shop sells as before Asaas until it is approved. **Not known is not unapproved**: a shop connected before this shipped has `accountApproval` null and is charged as before, until the daily look reads it — within a day of the deploy. A shop approved at Asaas is charged again from the next daily look, or at once from the button; the checkout's kept answer is dropped by the button, and otherwise follows within its revalidation window.
- **A shop's webhook token is a secret.** It is sealed with the key, never returned, and `asaas-access-token` is redacted from the API's request logs. Keep it out of any access log in front of the web that records request headers.
- **Asaas's quota is per shop**, 25,000 requests in twelve hours of the shop's own account. A `429` is honoured until the time Asaas names; nothing is retried in a loop.

## Meta Pixel

bee-link has **no app** at Meta either: each shop gives its own pixel's ID (BEELINK-269) and, to have its purchases told from the server, its own Conversions API access token (BEELINK-274), generated in the shop's Events Manager. Nothing of bee-link's is registered at Meta, and no variable of its own is needed.

- **`INTEGRATIONS_SECRET_KEY` is all it takes**, and only for the token. Without it a shop still saves its pixel's ID — the ID is public — and the panel says the token is not available in this installation.
- **What the server calls:** `POST https://graph.facebook.com/v25.0/<pixel id>/events`, from the API's container, one purchase a request, with the shop's token in the body — never in the address. The version is one constant, `META_GRAPH_VERSION` (`integrations/meta-pixel/meta-conversions-http.client.ts`). The API needs to reach `graph.facebook.com` on 443; nothing of Meta's calls in, so there is no webhook to open.
- **Nothing here was tried against the real Meta, and nothing from the production server.** Its way out is a datacenter address in France. The first shop to save a token should press "Enviar evento de teste" in Integrações → Pixel da Meta and see the event arrive in its Events Manager; a deployment that cannot reach Meta answers "Não foi possível falar com a Meta agora".
- **Nothing needs a cron.** The API's own clock runs every minute (`MetaPurchases`): the purchases owed (`order_meta_purchases`) are claimed and sent, one that failed is tried again after 1, 2, 4… minutes up to every six hours, and one past seven days is given up — Meta takes no event older. More than one API replica is fine: rows are claimed.
- **A token Meta refuses stops that shop's sends** (`store_integrations.secretRefusal`) until its shopkeeper saves another; the panel says so. The pixel in the browser needs no token and goes on.
- **A shop's token is a secret.** It is sealed with the key, never returned, and never written to a log: it travels in request bodies alone, which neither the API nor the web logs. Keep request bodies out of any access log in front of the web.
- **What was sent, and what was not, is in the database:** `SELECT "outcome", "lastError", "processedAt" FROM order_meta_purchases WHERE "orderId" = …` — `SENT`, `SKIPPED` (no token then, the buyer's consent gone, the order cancelled) or `GIVEN_UP` (Meta's own words, or too old). No row is an order that owed nothing: no consent kept, or registered in the panel.

## Shop domains

A shop may have a domain of its own (BEELINK-281): its owner saves it (`PUT /api/stores/:slug/custom-domain`), points its DNS at this server, and the API checks it — the DNS first, then an answer over HTTPS — and tells the web which host is which shop's. The web opening the shop at that host is BEELINK-283, and the panel's screen BEELINK-285; until they are in, a saved domain changes nothing a visitor sees.

- **`SHOP_DOMAIN_TARGET_IPS` is this server's public IPv4** — the address `WEB_DOMAIN`'s own `A` record points at; several, comma-separated, if the server has several. It is what a shopkeeper is told to point the domain's `A` record at, and a domain is taken for pointing here only when its `A` records are exactly these. Unset, a domain can be neither saved nor checked (`503 CUSTOM_DOMAIN_UNAVAILABLE`). IPv4 only: a domain's `AAAA` records are not read.
- **`SHOP_DOMAIN_RESERVED_HOSTS` names every other host this server's web answers on** — an earlier domain kept alive, an alias — comma-separated. Such a host already points here and already has its router and its certificate, so a check passes it at once: left out, the first shop to save it has it `ACTIVE`, and the web opens that shop there. Listed, it is refused like `WEB_DOMAIN` itself, with its subdomains. Production's is `link.beecoders.net`, which answered on 08/10/2026.
- **The router and the certificate of each domain are still added by hand**, until BEELINK-282: in Dokploy, the compose's **Domains** tab, two entries a domain — with and without `www` — on the service `web`, port 3000, HTTPS, Let's Encrypt, then a redeploy. Let's Encrypt validates over HTTP, so the domain's DNS must point here before the entry is added. Saving a domain adds no router: one whose DNS is right and that has no entry yet stays `PENDING` with `HTTPS_CERTIFICATE_INVALID`, since Traefik answers a host it does not know with its default certificate (seen on the production server on 08/10/2026).
- **What a check asks:** the domain's `A` records, of the DNS the `api` container uses, and then `GET https://<domain>/favicon.ico`, opened to the address in `SHOP_DOMAIN_TARGET_IPS` with the domain's name in the handshake. So the `api` container must reach the server's own public address on 443. Where it cannot — every check ends `HTTPS_UNREACHABLE` — set `SHOP_DOMAIN_PROBE=false`: the DNS being right is then enough, and nothing tells a domain that has its certificate from one that does not.
- **A check that fails never moves an `ACTIVE` domain back to `PENDING`**: the problem is answered and kept, and the status stays. Taking a domain off a shop is its owner removing it (`DELETE` on the same route), or `UPDATE stores SET "customDomain" = NULL, "customDomainStatus" = NULL, "customDomainCheckedAt" = NULL, "customDomainProblem" = NULL WHERE slug = …`.
- **A domain belongs to the first shop that saves it.** Pointing an `A` record at a shared address proves nothing about which shop it is for. While each domain is added by hand, look at which shop holds it before adding its entry: `SELECT slug, "customDomain", "customDomainStatus" FROM stores WHERE "customDomain" IS NOT NULL`.
- **Nothing here was tried on the production server**, the `api` container reaching its own public address least of all. The first domain is the test: with its DNS pointed and its entry added, `POST /api/stores/:slug/custom-domain/check` should answer it `ACTIVE`.

## Homologation

A second Compose service in Dokploy, on the branch `homolog`, from the same file. It is a stack of its own, and **none of its Environment is copied from production**: a value pasted across is how one of the two stops working.

| Variable | In homologation |
|---|---|
| `APP_ENVIRONMENT` | `homolog` — the flag "AMBIENTE DE HOMOLOGAÇÃO" over every page, and `noindex`. Production leaves it unset |
| `STACK_NAME` | its own, e.g. `beelink-homolog`. Traefik's router names are global: the same name as production and one of the two domains answers 404 |
| `WEB_DOMAIN` | its own host, with its own `A` record |
| `POSTGRES_PASSWORD`, `JWT_SECRET`, `INTEGRATIONS_SECRET_KEY` | generated again. The database is its own volume; a production session or sealed token must mean nothing here |
| `SMTP_URL`, `MAIL_FROM` | a mailbox or a sandbox inbox of its own, so a made-up shop never writes to a real customer under production's sender |
| `MELHOR_ENVIO_ENV` | `sandbox`, with the **sandbox app's** id and secret and `MELHOR_ENVIO_REDIRECT_URI` on this domain. The sandbox app registers this domain's callback and webhook |
| `ASAAS_ENV` | `sandbox` (or unset, which is the same). Shops paste `$aact_hmlg_…` keys |
| `GOOGLE_*` | left out, or a client with this domain's redirect URI registered |

**Two stacks share `dokploy-network`, and a service name is an alias on it.** The web reaches its API as `api-internal`, an alias on the stack's own network alone; `http://api:3001` would resolve to either stack's API once both are up, and production would read homologation's database (06/10/2026: it did). Anything else one service calls another by must be on `internal` only — `postgres` is — or go by an alias of its own.

`homolog` moves forward to `main` by a fast-forward, never the other way: nothing is committed to it.

## Constraints

- **HTTPS only.** Session cookies are `Secure` in production; over plain HTTP the browser drops them and nobody signs in.
- **One API instance.** The order chat keeps its sockets in process memory. Scaling out needs a Socket.IO adapter and sticky sessions first — [realtime.md](realtime.md) says which.
- **The e-mail provider is not optional.** Every account is born unverified, and the cart requires a signed-in shopper: without SMTP, nobody can buy.
- **`NEXT_PUBLIC_*` is decided at build time** — the MapTiler tile key and the realtime origin. Changing either means a redeploy, not a restart.
- **Backups are not automatic.** The database lives in the `postgres-data` volume. Schedule Dokploy's volume backup or a nightly `pg_dump` to storage off the server before the first real shop signs up.
- **A proxy in front of Traefik** (Cloudflare proxied) must be trusted in `TRUST_PROXY` and in Traefik's `forwardedHeaders.trustedIPs`, or every visitor shares one rate limit.
