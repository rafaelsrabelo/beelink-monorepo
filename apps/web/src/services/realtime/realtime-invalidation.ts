// Types
import type { RealtimeEvent } from "@harness-monorepo/contracts"
import type { QueryKey } from "@tanstack/react-query"

// App
import { catalogKeys } from "../catalog/catalog-hooks"
import { conversationKeys } from "../conversations/conversation-keys"
import { customerKeys } from "../customers/customer-hooks"
import { orderKeys } from "../orders/order-hooks"

/**
 * What the panel reads again when its room hears an event. An order placed or moved changes the
 * lists, the opened order and the customers' books; anything about a conversation changes the
 * conversations — and an order's status opens or closes its conversation too. Placing an order
 * takes its lines off the stock the catalogue shows, and cancelling one gives them back, as the
 * panel's own mutations read it again.
 */
export function panelKeysOf(event: RealtimeEvent, slug: string): QueryKey[] {
  switch (event.type) {
    case "order.created":
      return [orderKeys.lists(slug), customerKeys.store(slug), catalogKeys.products(slug)]
    case "order.status":
      return [
        orderKeys.lists(slug),
        orderKeys.detail(slug, event.orderNumber),
        customerKeys.store(slug),
        conversationKeys.shop(slug),
        ...(event.status === "CANCELLED" ? [catalogKeys.products(slug)] : []),
      ]
    case "conversation.message":
    case "conversation.read":
    case "conversation.closed":
      return [conversationKeys.shop(slug)]
  }
}

/**
 * What the shop window reads again. Its orders are drawn on the server, so an event about one
 * reads the page again (`page`); its conversations are queries, invalidated by key. A conversation
 * closes only with an order's move, whose own event already reads the page.
 */
export function shopperReadOf(event: RealtimeEvent, slug: string): { keys: QueryKey[]; page: boolean } {
  switch (event.type) {
    case "order.created":
    case "order.status":
      return { keys: [conversationKeys.shopper(slug)], page: true }
    case "conversation.message":
    case "conversation.read":
    case "conversation.closed":
      return { keys: [conversationKeys.shopper(slug)], page: false }
  }
}
