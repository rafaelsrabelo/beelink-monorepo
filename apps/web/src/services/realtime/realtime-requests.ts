// Types
import type { RealtimeTicket } from "@harness-monorepo/contracts"

/** A ticket the web's server refused to ask for; 401 is a session that ended, and the channel stops asking. */
export class RealtimeTicketError extends Error {
  constructor(readonly status: number) {
    super(`The ticket was refused: ${status}`)
    this.name = "RealtimeTicketError"
  }
}

async function ticketFrom(path: string): Promise<string> {
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: "{}" })
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
