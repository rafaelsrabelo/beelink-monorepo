// Libs
import { describe, expect, it } from "vitest"

// Types
import type { OrderPage, ShopConversationPage } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { notificationCountOf, notificationsOf, titledWith, toastOf } from "./panel-notifications"

const received = {
  total: 2,
  page: 1,
  pageSize: 5,
  orders: [{ number: 21, customer: { name: "Bia Souza" }, totalCents: 12990, placedAt: "2026-09-29T13:41:00.000Z" }],
} as unknown as OrderPage

const unread = {
  total: 1,
  page: 1,
  pageSize: 20,
  conversations: [
    { order: { number: 18, status: "PREPARING", fulfillment: "DELIVERY", open: true }, customer: { id: "c", name: "Carla", hasAccount: true }, lastMessage: { kind: "MESSAGE", author: "CUSTOMER", body: "Chega\\nsexta?", createdAt: "2026-09-29T13:50:00.000Z" }, unread: 2 },
  ],
} as unknown as ShopConversationPage

describe("the panel's bell", () => {
  it("counts the unread messages and the orders nobody accepted yet", () => {
    expect(notificationCountOf({ messages: 3, conversations: 2 }, received)).toBe(5)
    expect(notificationCountOf(undefined, undefined)).toBe(0)
  })

  it("lists the latest first, each leading to its order", () => {
    const items = notificationsOf(received, unread, { slug: "loja", locale: "pt-BR", messages: ptBR })

    expect(items.map((item) => item.title)).toEqual(["Mensagem no pedido nº 18", "Novo pedido nº 21"])
    expect(items[1]).toMatchObject({ kind: "order", href: "/admin/loja/orders/21" })
    expect(items[1]?.detail).toMatch(/^Bia Souza · R\$\s?129,90$/)
    expect(items[0]).toMatchObject({ kind: "message", href: "/admin/loja/orders/18" })
  })

  it("never shows the shop's own reply as the customer's words", () => {
    const replied = { ...unread, conversations: [{ ...unread.conversations[0], lastMessage: { kind: "MESSAGE", author: "SHOP", body: "Sai amanhã", createdAt: "2026-09-29T13:55:00.000Z" } }] } as unknown as ShopConversationPage
    expect(notificationsOf(undefined, replied, { slug: "loja", locale: "pt-BR", messages: ptBR })[0]?.detail).toBe("Carla")
  })

  it("toasts only what came from outside", () => {
    expect(toastOf({ type: "order.created", orderNumber: 21, placedBy: "CUSTOMER" }, ptBR)).toBe("Novo pedido nº 21")
    expect(toastOf({ type: "order.created", orderNumber: 22, placedBy: "SHOP" }, ptBR)).toBeNull()
    expect(toastOf({ type: "conversation.message", orderNumber: 18, author: "CUSTOMER" }, ptBR)).toBe("Mensagem no pedido nº 18")
    expect(toastOf({ type: "conversation.message", orderNumber: 18, author: "SHOP" }, ptBR)).toBeNull()
    expect(toastOf({ type: "order.status", orderNumber: 18, status: "ACCEPTED" }, ptBR)).toBeNull()
  })

  /** Money nobody asked for is told at once, since bee-link refunds nothing by itself (BEELINK-206). */
  it("tells of money an order did not ask for, and not of a payment that only moved", () => {
    expect(toastOf({ type: "order.payment", orderNumber: 18, status: "RECEIVED", stray: null, approved: false }, ptBR)).toBeNull()
    expect(toastOf({ type: "order.payment", orderNumber: 18, status: "OVERDUE", stray: null, approved: false }, ptBR)).toBeNull()
    expect(toastOf({ type: "order.payment", orderNumber: 18, status: "RECEIVED", stray: "ORDER_CANCELLED", approved: false }, ptBR)).toBe("O pedido nº 18 foi pago depois de cancelado. O dinheiro está na sua conta Asaas.")
    expect(toastOf({ type: "order.payment", orderNumber: 18, status: "RECEIVED", stray: "ORDER_ALREADY_PAID", approved: false }, ptBR)).toBe("O pedido nº 18 foi pago duas vezes. O segundo pagamento está na sua conta Asaas.")
  })

  /** BEELINK-207: once a payment, on the event the API marks as its news. */
  it("tells of a payment approved on the one event that is its news", () => {
    expect(toastOf({ type: "order.payment", orderNumber: 18, status: "CONFIRMED", stray: null, approved: true }, ptBR)).toBe("Pedido nº 18 pago")
    expect(toastOf({ type: "order.payment", orderNumber: 18, status: "RECEIVED", stray: null, approved: true }, ptBR)).toBe("Pedido nº 18 pago")
  })

  it("counts and lists the paid orders nobody opened yet, by when the money came", () => {
    const paid = {
      total: 1,
      page: 1,
      pageSize: 5,
      orders: [{ number: 20, customer: { name: "Duda Reis" }, totalCents: 5990, deliveryFeeCents: 0, placedAt: "2026-09-29T12:00:00.000Z", payment: { status: "RECEIVED", expiresAt: null, paidAt: "2026-09-29T13:45:00.000Z" } }],
    } as unknown as OrderPage

    expect(notificationCountOf({ messages: 3, conversations: 2 }, received, paid)).toBe(6)
    const items = notificationsOf(received, unread, { slug: "loja", locale: "pt-BR", messages: ptBR }, paid)
    // Paid at 13:45: between the order of 13:41 and the message of 13:50, though it was placed before both.
    expect(items.map((item) => item.title)).toEqual(["Mensagem no pedido nº 18", "Pedido nº 20 pago", "Novo pedido nº 21"])
    expect(items[1]).toMatchObject({ id: "payment-20", kind: "payment", href: "/admin/loja/orders/20" })
    expect(items[1]?.detail).toMatch(/^Duda Reis · R\$\s?59,90$/)
  })

  it("puts the count in the tab's title, and takes it off at none", () => {
    expect(titledWith("Pedidos · bee-link", 3)).toBe("(3) Pedidos · bee-link")
    expect(titledWith("(3) Pedidos · bee-link", 4)).toBe("(4) Pedidos · bee-link")
    expect(titledWith("(4) Pedidos · bee-link", 0)).toBe("Pedidos · bee-link")
  })
})
