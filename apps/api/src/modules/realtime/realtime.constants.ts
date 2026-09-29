/**
 * Where the socket answers. Fixed, not built from `API_PREFIX`: a gateway does not take the global
 * prefix, and the web's client names this same path — contracts hold types only, so the two spell
 * it apart.
 */
export const REALTIME_PATH = '/api/socket.io';

/** The one event name: its payload's `type` says what changed. The web listens for the same. */
export const REALTIME_EVENT = 'event';

/** How long a ticket lets its bearer in: long enough to open a socket, short enough to be worth nothing if it leaks. */
export const REALTIME_TICKET_TTL_MS = 60_000;

/** A shop's room: its panel, in every tab its shopkeepers have open. */
export function storeRoom(storeId: string): string {
  return `store:${storeId}`;
}

/** A shopper's room at a shop: their customer record there, which is one shop's alone. */
export function customerRoom(customerId: string): string {
  return `customer:${customerId}`;
}

/** Every socket a session opened, so ending the session closes them with it. */
export function sessionRoom(sessionId: string): string {
  return `session:${sessionId}`;
}
