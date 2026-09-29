# The real-time channel

> **Tier:** repo. What hosting the API's WebSocket needs, and what changes with more than one
> instance. Introduced by BEELINK-161; the plan with its decisions is in `docs/plans/`.

## What it is

The API serves a Socket.IO gateway at `/api/socket.io`. The browser opens it directly — the one
connection that does not go through the web's BFF, because Next does not pass a WebSocket through.
It enters with a **ticket**: 60 seconds, single use, asked for by the web's server with the session
in its cookies. The session's tokens never reach the page.

The channel only tells: an order placed or moved, a message, a read, a conversation closed. Every
write still goes through the REST, with its checks. A page that loses the channel still works; it
just reads again when the channel comes back.

## What the hosting needs

- **The API's proxy must accept WebSocket upgrades** on `/api/socket.io`: `Upgrade` and
  `Connection` headers passed through, and an idle timeout longer than Socket.IO's heartbeat (25 s).
  Without it the client falls back to long-polling, which works but costs a request every few
  seconds per open page.
- **`NEXT_PUBLIC_REALTIME_URL`** on the web, set at **build** time (every `NEXT_PUBLIC_` value is
  inlined): the API's public origin, e.g. `https://api.example.com`. Unset, the channel stays shut.
- **`CORS_ORIGINS`** on the API must list the web's origin: the socket's handshake is checked
  against it, as every browser call is.

## More than one instance

Tickets already work across instances: they live in the database (`realtime_tickets`), and taking
one is a single `DELETE … RETURNING`.

Events do not. An event is sent to the rooms of the instance that wrote it, and a socket connected
to another instance never hears it. With more than one API instance:

1. Add the Socket.IO **Redis adapter** (`@socket.io/redis-adapter`) in the gateway's setup, so every
   instance relays every room's events.
2. Keep **sticky sessions** on the load balancer for `/api/socket.io`, or restrict the client to the
   WebSocket transport: long-polling's requests must reach the instance that holds the session.

Until then, run one instance of the API.
