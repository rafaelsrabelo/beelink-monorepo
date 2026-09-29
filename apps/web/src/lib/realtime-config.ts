/**
 * Where the browser opens its real-time socket: the API itself, the one thing the page reaches
 * without the BFF — Next does not pass a WebSocket through. Inlined at build, like every
 * `NEXT_PUBLIC_` value; unset, the channel stays shut and every page still works by reading again.
 */
export const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL?.trim() || null

/** The socket's path and its one event name, as the API's gateway spells them; contracts hold types only. */
export const REALTIME_PATH = "/api/socket.io"
export const REALTIME_EVENT = "event"
