// Types
import type { ShopConversationPage, ShopConversationQuery, ShopConversationUnread } from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class ShopConversationError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "ShopConversationError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string): Promise<T> {
  const response = await fetch(path, { method: "GET", headers: JSON_HEADERS })
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
