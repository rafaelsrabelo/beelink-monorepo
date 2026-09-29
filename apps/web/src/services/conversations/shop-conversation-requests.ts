// Types
import type { SendConversationMessagePayload, ShopConversation, ShopConversationPage, ShopConversationQuery, ShopConversationUnread } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class ShopConversationError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "ShopConversationError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, init: { method: "GET" | "POST"; body?: string } = { method: "GET" }): Promise<T> {
  const response = await fetch(path, { method: init.method, headers: JSON_HEADERS, ...(init.body !== undefined ? { body: init.body } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new ShopConversationError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

/** A page of the shop's conversations, through this app's own handler; the API's address is server-only. */
export function fetchShopConversations(slug: string, query: ShopConversationQuery = {}): Promise<ShopConversationPage> {
  const search = new URLSearchParams()
  if (query.filter) search.set("filter", query.filter)
  if (query.q) search.set("q", query.q)
  if (query.page && query.page > 1) search.set("page", String(query.page))
  return ask(`/api/stores/${encodeURIComponent(slug)}/conversations${search.size ? `?${search.toString()}` : ""}`)
}

/** What the bell counts on the messages' side. */
export function fetchShopUnread(slug: string): Promise<ShopConversationUnread> {
  return ask(`/api/stores/${encodeURIComponent(slug)}/conversations/unread`)
}

const orderPath = (slug: string, number: number) => `/api/stores/${encodeURIComponent(slug)}/orders/${number}/conversation`

/** One order's conversation, as the shop reads it; empty while its customer has not written. */
export function fetchShopConversation(slug: string, number: number): Promise<ShopConversation> {
  return ask(orderPath(slug, number))
}

/** The shop's answer; the whole conversation comes back, the answer in it. */
export function sendShopMessage(slug: string, number: number, payload: SendConversationMessagePayload): Promise<ShopConversation> {
  return ask(`${orderPath(slug, number)}/messages`, { method: "POST", body: JSON.stringify(payload) })
}

/** The customer's messages, read now. */
export function markShopConversationRead(slug: string, number: number): Promise<ShopConversation> {
  return ask(`${orderPath(slug, number)}/read`, { method: "POST", body: "{}" })
}
