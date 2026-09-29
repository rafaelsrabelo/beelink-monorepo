# The real-time channel

> **Tier:** repo. What hosting the API's WebSocket needs, and what changes with more than one
> instance. Introduced by BEELINK-161; the plan with its decisions is in `docs/plans/`.

## What it is

The API serves a Socket.IO gateway at `/api/socket.io` — a fixed path, not built from
`API_PREFIX`. The browser opens it to the API itself: the one connection that does not go through
the web's BFF, because a route handler cannot hold a WebSocket open. It enters with a **ticket**:
60 seconds, single use, asked for by the web's server with the session in its cookies. The session's
tokens never reach the page, and the socket belongs to that session — signing out, resetting the
password or a reused refresh token closes it.

The channel only tells: an order placed or moved, a message, a read, a conversation closed. Every
write still goes through the REST, with its checks. A page that loses the channel still works; it
reads again when the channel comes back.

## What the hosting needs

- **A route to the socket on the web's own domain.** The API can stay private: the proxy that
  serves the web sends only `/api/socket.io` on the web's domain on to the API. With Traefik, a
  second router — `Host(<web domain>) && PathPrefix(/api/socket.io)` — to the API's port, the API
  joining the proxy's network. Its rule is longer than the web's `Host(…)`, so Traefik tries it
  first. Same origin: no second domain, no second certificate, no CORS, and the rest of the API
  still has no route from outside.
- **`NEXT_PUBLIC_REALTIME_URL`** on the web, set at **build** time, since every `NEXT_PUBLIC_` value
  is inlined: behind that route, the web's own origin (`https://<web domain>`); in development, the
  API's (`http://localhost:3001`). Only the origin is read. Unset, the channel stays shut and every
  page works as before.
- **WebSocket upgrades through the proxy**, with an idle timeout longer than Socket.IO's heartbeat
  (a ping every 25 s); Traefik passes them as they are. Without them the client falls back to
  long-polling, which works but holds one request open per page, renewed at every heartbeat.
- **`CORS_ORIGINS`** matters only where the socket's origin differs from the page's, as in
  development: it lets the long-polling transport answer the web. It is not what guards the
  channel — a WebSocket is not subject to CORS. The ticket is, and it travels in the handshake, not
  in a cookie: a page on another site has nothing of the visitor's to open a socket with.
- **The socket's path is outside the API's rate limits.** A guess at a ticket costs one indexed
  delete against 256 random bits; a flood of handshakes, if one ever comes, is the proxy's to limit.

Carrying the socket through Next instead — a `rewrites()` entry to the API, which Next forwards a
WebSocket upgrade on — would keep the API with no route at all. It was left: the destination is
fixed at `next build`, Next's trailing-slash redirect would have to be turned off at both ends of
the socket, and every open page would hold a connection in the web's process as well as the API's.

## More than one instance

Tickets already work across instances: they live in the database (`realtime_tickets`), and taking
one is a single `DELETE … RETURNING`.

Events do not. An event is sent to the rooms of the instance that wrote it: a socket connected to
another instance never hears it, and is not closed when its session ends there. With more than one
API instance:

1. Give Socket.IO an **adapter** that relays rooms between the instances, through a custom
   `IoAdapter` in `app.setup.ts`, where the plain one is set today. `@socket.io/postgres-adapter`
   rides `LISTEN`/`NOTIFY` on the Postgres already running, with no new service;
   `@socket.io/redis-adapter` is the one to take once Redis is in the stack anyway. Either carries
   the closing of an ended session's sockets as well.
2. Keep **sticky sessions** on the proxy for `/api/socket.io`, or restrict the client to the
   WebSocket transport: long-polling's requests must reach the instance that holds the session.

Until then, run one instance of the API.
