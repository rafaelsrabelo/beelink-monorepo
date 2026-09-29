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

## Constraints

- **HTTPS only.** Session cookies are `Secure` in production; over plain HTTP the browser drops them and nobody signs in.
- **One API instance.** The order chat keeps its sockets in process memory. Scaling out needs a Socket.IO adapter and sticky sessions first — [realtime.md](realtime.md) says which.
- **The e-mail provider is not optional.** Every account is born unverified, and the cart requires a signed-in shopper: without SMTP, nobody can buy.
- **`NEXT_PUBLIC_*` is decided at build time** — the MapTiler tile key and the realtime origin. Changing either means a redeploy, not a restart.
- **Backups are not automatic.** The database lives in the `postgres-data` volume. Schedule Dokploy's volume backup or a nightly `pg_dump` to storage off the server before the first real shop signs up.
- **A proxy in front of Traefik** (Cloudflare proxied) must be trusted in `TRUST_PROXY` and in Traefik's `forwardedHeaders.trustedIPs`, or every visitor shares one rate limit.
