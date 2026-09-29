// Libs
import { describe, expect, it } from "vitest"

// App
import { panelKeysOf, shopperReadOf } from "./realtime-invalidation"

describe("what an event reads again", () => {
  it("in the panel: the lists and the customers for a new order, the opened order and its conversation for a move", () => {
    expect(panelKeysOf({ type: "order.created", orderNumber: 7 }, "loja")).toEqual([["orders", "loja", "list"], ["store-customers", "loja"]])
    expect(panelKeysOf({ type: "order.status", orderNumber: 7, status: "DELIVERED" }, "loja")).toEqual([
      ["orders", "loja", "list"],
      ["orders", "loja", "detail", 7],
      ["store-customers", "loja"],
      ["conversations", "shop", "loja"],
    ])
    expect(panelKeysOf({ type: "conversation.message", orderNumber: 7, author: "CUSTOMER" }, "loja")).toEqual([["conversations", "shop", "loja"]])
  })

  /** The shopper's orders are drawn on the server: news of one reads the page; a conversation is a query. */
  it("in the shop window: the page for an order, the conversations by key", () => {
    expect(shopperReadOf({ type: "order.status", orderNumber: 7, status: "ACCEPTED" }, "loja")).toEqual({ keys: [["conversations", "shopper", "loja"]], page: true })
    expect(shopperReadOf({ type: "conversation.message", orderNumber: 7, author: "SHOP" }, "loja")).toEqual({ keys: [["conversations", "shopper", "loja"]], page: false })
    expect(shopperReadOf({ type: "conversation.closed", orderNumber: 7 }, "loja").page).toBe(true)
  })
})
