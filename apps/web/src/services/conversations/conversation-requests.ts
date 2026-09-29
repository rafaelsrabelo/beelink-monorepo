// Types
import type { CustomerConversation, CustomerConversationSummary, SendConversationMessagePayload } from "@harness-monorepo/contracts"

/** What a refused conversation call carries: the API's stable code, never a sentence. */
export class ShopperConversationError extends Error {
  constructor(
    readonly errorCode: string,
    readonly status: number,
  ) {
    super(errorCode)
    this.name = "ShopperConversationError"
  }
}

/**
 * To the shop's own handlers (`/<slug>/api/…`), where the shopper's cookies reach — never the API,
 * and never a token in page code. Every call says it speaks JSON, reads included: the handlers
 * refuse what a cross-site form could send.
 */
async function ask<T>(path: string, init: { method: "GET" | "POST"; body?: string } = { method: "GET" }): Promise<T> {
  const response = await fetch(path, {
    method: init.method,
    headers: { "content-type": "application/json", accept: "application/json" },
    ...(init.body !== undefined ? { body: init.body } : {}),
  }).catch(() => null)
  if (!response) throw new ShopperConversationError("UNKNOWN", 0)

  const answer: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = typeof answer === "object" && answer !== null && "errorCode" in answer ? String(answer.errorCode) : null
    throw new ShopperConversationError(code ?? (response.status === 429 ? "RATE_LIMITED" : "UNKNOWN"), response.status)
  }
  if (answer === null) throw new ShopperConversationError("UNKNOWN", response.status)
  return answer as T
}

const base = (slug: string) => `/${encodeURIComponent(slug)}/api`

/** The shopper's conversations at the shop: those still taking messages first. */
export function fetchShopperConversations(slug: string): Promise<CustomerConversationSummary[]> {
  return ask(`${base(slug)}/conversations`)
}

/** One order's conversation; empty, and still open while the order is on its way, until they write. */
export function fetchShopperConversation(slug: string, number: number): Promise<CustomerConversation> {
  return ask(`${base(slug)}/orders/${number}/conversation`)
}

/** A message to the shop; the answer is the whole conversation, the new message in it. */
export function sendShopperMessage(slug: string, number: number, payload: SendConversationMessagePayload): Promise<CustomerConversation> {
  return ask(`${base(slug)}/orders/${number}/conversation/messages`, { method: "POST", body: JSON.stringify(payload) })
}

/** The shop's messages, read now. */
export function markShopperConversationRead(slug: string, number: number): Promise<CustomerConversation> {
  return ask(`${base(slug)}/orders/${number}/conversation/read`, { method: "POST", body: "{}" })
}
