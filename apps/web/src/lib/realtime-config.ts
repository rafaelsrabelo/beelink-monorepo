/**
 * The origin of a configured socket URL, or null for none or one that is not a URL. Only the origin:
 * a path — `…/api`, copied from `API_URL` — would reach Socket.IO as a namespace the gateway lacks.
 */
export function realtimeOriginOf(value: string | undefined): string | null {
  if (!value?.trim()) return null
  try {
    // `localhost:3001` parses too, with `localhost:` for a scheme.
    const url = new URL(value.trim())
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null
  } catch {
    return null
  }
}

/**
 * Where the browser opens its real-time socket: the API itself — the one thing the page reaches
 * without the BFF, since a route handler cannot hold a WebSocket open. Behind one domain it is the
 * web's own origin, the proxy sending `/api/socket.io` on to the API (docs/repo/realtime.md).
 * Inlined at build, like every `NEXT_PUBLIC_` value; unset, the channel stays shut and every page
 * still works by reading again.
 */
export const REALTIME_URL = realtimeOriginOf(process.env.NEXT_PUBLIC_REALTIME_URL)

/** The socket's path and its one event name, as the API's gateway spells them; contracts hold types only. */
export const REALTIME_PATH = "/api/socket.io"
export const REALTIME_EVENT = "event"
