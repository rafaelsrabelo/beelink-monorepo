// Types
import type { RealtimeTicket } from "@harness-monorepo/contracts"

/**
 * A ticket the web's server would not ask for, with its answer's status: 403 or 404 is a shop that
 * is not the session's, and the channel stops asking; 401 may be only a lapsed cookie.
 */
export class RealtimeTicketError extends Error {
  constructor(readonly status: number) {
    super(`The ticket was refused: ${status}`)
    this.name = "RealtimeTicketError"
  }
}

/** Past this, the attempt is given up and asked again later: a hung answer would hold the socket half-open. */
const TICKET_TIMEOUT_MS = 10_000

async function ticketFrom(path: string): Promise<string> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: "{}",
    signal: AbortSignal.timeout(TICKET_TIMEOUT_MS),
  })
  if (!response.ok) throw new RealtimeTicketError(response.status)
  return ((await response.json()) as RealtimeTicket).ticket
}

/** The panel's pass to its shop's room, asked through the panel's own handler. */
export function fetchPanelTicket(slug: string): Promise<string> {
  return ticketFrom(`/api/stores/${encodeURIComponent(slug)}/realtime/ticket`)
}

/** The shopper's pass to their own room, asked through the shop's handler, where their cookies live. */
export function fetchShopperTicket(slug: string): Promise<string> {
  return ticketFrom(`/${encodeURIComponent(slug)}/api/realtime/ticket`)
}
