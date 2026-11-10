// Libs
import { describe, expect, it } from "vitest"

// Types
import type { OrderSummary } from "@harness-monorepo/contracts"

// UI
import { ptBR as messages } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ageOf, gestorColumnsOf, gestorOrderHrefOf } from "./gestor-board"

const now = new Date("2026-11-10T17:30:00.000Z")
const base = { id: "o", customer: { id: "c", name: "Bia Souza", phone: null }, fulfillment: "DELIVERY", totalCents: 4786, deliveryFeeCents: 700, itemsCount: 7, strays: 0 } as const

const order = (number: number, status: OrderSummary["status"], minutesAgo: number, patch: Partial<OrderSummary> = {}): OrderSummary => ({
  ...base,
  number,
  status,
  paymentMethod: "MONEY",
  paymentChannel: "OFFLINE",
  payment: null,
  placedAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(),
  ...patch,
})

const context = { slug: "leia", locale: "pt-BR", messages, now }

describe("the manager's board", () => {
  it("queues each column oldest first, from a list that comes latest first", () => {
    const open = [order(5, "RECEIVED", 1), order(4, "PREPARING", 4), order(3, "RECEIVED", 6), order(2, "ACCEPTED", 9), order(1, "OUT_FOR_DELIVERY", 30)]
    const columns = gestorColumnsOf(open, [order(0, "DELIVERED", 60)], context)

    expect(columns.NEW.map((card) => card.number)).toEqual([3, 5])
    expect(columns.PREPARING.map((card) => card.number)).toEqual([2, 4])
    expect(columns.ON_THE_WAY.map((card) => card.number)).toEqual([1])
    expect(columns.DONE.map((card) => card.number)).toEqual([0])
  })

  it("writes a card in the counter's words, its money paid or still to be paid", () => {
    const paid = order(9, "RECEIVED", 3, { paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "RECEIVED", expiresAt: null, paidAt: now.toISOString(), refundingCents: 0 }, itemsCount: 1 })
    const [card] = gestorColumnsOf([paid], [], context).NEW

    expect(card).toMatchObject({ number: 9, customer: "Bia Souza", items: "1 item", fulfillmentLabel: "Entrega", payment: "Pix · Pago", paymentTone: "paid", href: "/admin/leia/gestor?pedido=9" })
    expect(card!.total.replace(/\s/g, " ")).toBe("R$ 47,86")
    expect(gestorColumnsOf([order(8, "ACCEPTED", 3)], [], context).PREPARING[0]).toMatchObject({ payment: "Dinheiro", paymentTone: "due", items: "7 itens" })
    expect(gestorColumnsOf([], [order(7, "DELIVERED", 90)], context).DONE[0]).toMatchObject({ paymentTone: "neutral" })
  })

  it("says how long an order waited, in minutes and then hours", () => {
    expect(ageOf(now.toISOString(), now, "pt-BR")).toBe("agora")
    expect(ageOf(new Date(now.getTime() - 3 * 60_000).toISOString(), now, "pt-BR")).toBe("há 3 min.")
    expect(ageOf(new Date(now.getTime() - 125 * 60_000).toISOString(), now, "pt-BR")).toBe("há 2 h")
  })

  it("opens an order beside the board, on its conversation when asked", () => {
    expect(gestorOrderHrefOf("leia", 12)).toBe("/admin/leia/gestor?pedido=12")
    expect(gestorOrderHrefOf("leia", 12, "conversa")).toBe("/admin/leia/gestor?pedido=12&aba=conversa")
  })
})
