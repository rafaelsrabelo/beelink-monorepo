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
- **`MELHOR_ENVIO_ENV` and the app go together.** The sandbox app's id and secret with `sandbox`, the production app's with `production`; a sandbox shop's tokens mean nothing in production, so switching disconnects nothing on its own — each shop connects again.
- **`INTEGRATIONS_SECRET_KEY` is set once and kept.** It seals every shop's tokens. A new key, or a lost one, leaves the stored tokens unreadable, and every shop has to connect again. Keep it out of any backup that travels with the database.
- **The credentials live in Dokploy's Environment**, never in the repository.

## Constraints

- **HTTPS only.** Session cookies are `Secure` in production; over plain HTTP the browser drops them and nobody signs in.
- **One API instance.** The order chat keeps its sockets in process memory. Scaling out needs a Socket.IO adapter and sticky sessions first — [realtime.md](realtime.md) says which.
- **The e-mail provider is not optional.** Every account is born unverified, and the cart requires a signed-in shopper: without SMTP, nobody can buy.
- **`NEXT_PUBLIC_*` is decided at build time** — the MapTiler tile key and the realtime origin. Changing either means a redeploy, not a restart.
- **Backups are not automatic.** The database lives in the `postgres-data` volume. Schedule Dokploy's volume backup or a nightly `pg_dump` to storage off the server before the first real shop signs up.
- **A proxy in front of Traefik** (Cloudflare proxied) must be trusted in `TRUST_PROXY` and in Traefik's `forwardedHeaders.trustedIPs`, or every visitor shares one rate limit.
