// Libs
import { describe, expect, it } from "vitest"

// App
import { panelKeysOf, shopperReadOf } from "./realtime-invalidation"

describe("what an event reads again", () => {
  it("in the panel: the lists, the customers and the stock for a new order, the opened order and its conversation for a move", () => {
    expect(panelKeysOf({ type: "order.created", orderNumber: 7, placedBy: "CUSTOMER" }, "loja")).toEqual([
      ["orders", "loja", "list"],
      ["store-customers", "loja"],
      ["catalog", "loja", "products"],
    ])
    expect(panelKeysOf({ type: "order.status", orderNumber: 7, status: "DELIVERED" }, "loja")).toEqual([
      ["orders", "loja", "list"],
      ["orders", "loja", "detail", 7],
      ["store-customers", "loja"],
      ["conversations", "shop", "loja"],
    ])
    expect(panelKeysOf({ type: "conversation.message", orderNumber: 7, author: "CUSTOMER" }, "loja")).toEqual([["conversations", "shop", "loja"]])
  })

  /** A cancel gives the order's lines back to the stock, as the panel's own cancel reads it again. */
  it("in the panel: the stock again when an order is cancelled", () => {
    expect(panelKeysOf({ type: "order.status", orderNumber: 7, status: "CANCELLED" }, "loja")).toContainEqual(["catalog", "loja", "products"])
  })

  /** A payment that moved (BEELINK-206): the panel reads the list and the order; the shop window, that order's charge and the page. */
  it("reads an order's charge again when its payment moves, on both sides", () => {
    const paid = { type: "order.payment", orderNumber: 7, status: "RECEIVED", stray: null, approved: true } as const
    expect(panelKeysOf(paid, "loja")).toEqual([
      ["orders", "loja", "list"],
      ["orders", "loja", "detail", 7],
    ])
    expect(shopperReadOf(paid, "loja")).toEqual({ keys: [["storefront", "loja", "payment", 7]], page: true })
  })

  /** The shopper's orders are drawn on the server: news of one reads the page; a conversation is a query. */
  it("in the shop window: the page for an order, the conversations by key", () => {
    // An order's move reads its charge again too (BEELINK-205): a payment screen left open follows a cancellation.
    expect(shopperReadOf({ type: "order.status", orderNumber: 7, status: "ACCEPTED" }, "loja")).toEqual({ keys: [["conversations", "shopper", "loja"], ["storefront", "loja", "payment"]], page: true })
    expect(shopperReadOf({ type: "conversation.message", orderNumber: 7, author: "SHOP" }, "loja")).toEqual({ keys: [["conversations", "shopper", "loja"]], page: false })
    // The move that closed it already read the page.
    expect(shopperReadOf({ type: "conversation.closed", orderNumber: 7 }, "loja").page).toBe(false)
  })
})
