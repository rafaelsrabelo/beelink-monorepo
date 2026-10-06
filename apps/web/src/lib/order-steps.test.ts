// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOrder } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { orderStepsOf } from "./order-steps"

const context = { locale: "pt-BR", messages: ptBR }
const charge: NonNullable<CustomerOrder["payment"]> = { status: "PENDING", method: "PIX", installments: 1, amountCents: 5990, refundedCents: 0, expiresAt: "2026-09-29T02:59:59.999Z", paidAt: null }

type Stepped = Pick<CustomerOrder, "status" | "fulfillment" | "placedAt" | "events" | "paymentChannel" | "payment">

const order = (over: Partial<Stepped>): Stepped => ({
  status: "PREPARING" as const,
  fulfillment: "DELIVERY" as const,
  paymentChannel: "OFFLINE",
  payment: null,
  placedAt: "2026-09-27T17:02:00.000Z",
  events: [
    { status: "RECEIVED" as const, at: "2026-09-27T17:02:00.000Z" },
    { status: "ACCEPTED" as const, at: "2026-09-27T18:10:00.000Z" },
    { status: "PREPARING" as const, at: "2026-09-28T12:00:00.000Z" },
  ],
  ...over,
})

describe("orderStepsOf", () => {
  it("walks a delivery through its five steps, done up to the status and waiting after it", () => {
    const steps = orderStepsOf(order({}), context)!

    expect(steps.map((step) => [step.label, step.state])).toEqual([
      ["Pedido feito", "done"],
      ["Loja confirmou", "done"],
      ["Em preparo", "current"],
      ["Saiu para entrega", "todo"],
      ["Entregue", "todo"],
    ])
    // Brasília's clock, three hours behind UTC.
    expect(steps[0]!.when).toContain("14:02")
    expect(steps[2]!.when).toContain("09:00")
    expect(steps[3]!.when).toBeNull()
  })

  it("gives a pick-up four steps, the last one the shopper taking it", () => {
    const steps = orderStepsOf(order({ fulfillment: "PICKUP" }), context)!

    expect(steps.map((step) => step.label)).toEqual(["Pedido feito", "Loja confirmou", "Em preparo", "Retirado na loja"])
  })

  /** The panel has no fixed path: a pick-up marked "out for delivery" has left preparing behind and waits to be taken. */
  it("keeps a pick-up the shop marked out for delivery between preparing and picked up", () => {
    const steps = orderStepsOf(order({ fulfillment: "PICKUP", status: "OUT_FOR_DELIVERY" }), context)!

    expect(steps.map((step) => step.state)).toEqual(["done", "done", "done", "todo"])
  })

  it("marks every step done once delivered, and a step the shop skipped done without a moment", () => {
    const steps = orderStepsOf(order({ status: "DELIVERED", events: [...order({}).events, { status: "DELIVERED", at: "2026-09-29T15:00:00.000Z" }] }), context)!

    expect(steps.every((step) => step.state === "done")).toBe(true)
    expect(steps[3]!.when).toBeNull()
    expect(steps[4]!.when).toContain("12:00")
  })

  it("starts an order the shop placed at its placing, with the shop's confirmation as its moment", () => {
    const steps = orderStepsOf(order({ status: "ACCEPTED", events: [{ status: "ACCEPTED", at: "2026-09-27T17:02:00.000Z" }] }), context)!

    expect(steps.slice(0, 2).map((step) => [step.state, Boolean(step.when)])).toEqual([
      ["done", true],
      ["current", true],
    ])
  })

  it("draws no steps for a cancelled order, which is told in a sentence", () => {
    expect(orderStepsOf(order({ status: "CANCELLED" }), context)).toBeNull()
    expect(orderStepsOf(order({ status: "CANCELLED", paymentChannel: "ONLINE", payment: { ...charge, status: "RECEIVED", paidAt: "2026-09-27T17:05:00.000Z" } }), context)).toBeNull()
  })

  describe("an order charged online (BEELINK-207)", () => {
    const placed = { status: "RECEIVED" as const, events: [{ status: "RECEIVED" as const, at: "2026-09-27T17:02:00.000Z" }], paymentChannel: "ONLINE" as const }
    const paid = { ...charge, status: "RECEIVED" as const, paidAt: "2026-09-27T17:05:00.000Z" }
    const told = (over: Partial<Stepped>) => orderStepsOf(order({ paymentChannel: "ONLINE", ...over }), context)!.map((step) => [step.label, step.state])

    it("waits for its payment right after it is placed, in the payment box's own words", () => {
      const steps = orderStepsOf(order({ ...placed, payment: charge }), context)!

      expect(steps.map((step) => [step.label, step.state])).toEqual([
        ["Pedido feito", "done"],
        ["Aguardando pagamento", "current"],
        ["Loja confirmou", "todo"],
        ["Em preparo", "todo"],
        ["Saiu para entrega", "todo"],
        ["Entregue", "todo"],
      ])
      expect(steps[1]!.label).toBe(ptBR.storefront.orderPayAwaiting)
      expect(steps[1]!.when).toBeNull()
      // With no charge made yet, with one past its day and with one Asaas refused: still to be paid.
      for (const payment of [null, { ...charge, status: "OVERDUE" as const }, { ...charge, status: "FAILED" as const }, { ...charge, status: "CANCELLED" as const }]) {
        expect(told({ ...placed, payment })[1]).toEqual(["Aguardando pagamento", "current"])
      }
    })

    it("marks the payment approved, with when, once it is confirmed or received", () => {
      const steps = orderStepsOf(order({ ...placed, payment: paid }), context)!

      expect(steps.slice(0, 3).map((step) => [step.label, step.state])).toEqual([
        ["Pedido feito", "done"],
        ["Pagamento aprovado", "current"],
        ["Loja confirmou", "todo"],
      ])
      expect(steps[1]!.label).toBe(ptBR.storefront.orderPayApproved)
      expect(steps[1]!.when).toContain("14:05")
      expect(told({ ...placed, payment: { ...paid, status: "CONFIRMED" } })[1]).toEqual(["Pagamento aprovado", "current"])
    })

    it("keeps it done behind an order that moved on, and a pick-up's line with five steps", () => {
      expect(told({ payment: paid })).toEqual([
        ["Pedido feito", "done"],
        ["Pagamento aprovado", "done"],
        ["Loja confirmou", "done"],
        ["Em preparo", "current"],
        ["Saiu para entrega", "todo"],
        ["Entregue", "todo"],
      ])
      expect(told({ payment: paid, fulfillment: "PICKUP" }).map(([label]) => label)).toEqual(["Pedido feito", "Pagamento aprovado", "Loja confirmou", "Em preparo", "Retirado na loja"])
    })

    /** Accepting holds nothing (decision 12): the shop may go ahead, and the payment still waits. */
    it("leaves the payment still to come when the shop moved on without it, even once delivered", () => {
      expect(told({ payment: charge }).slice(0, 4)).toEqual([
        ["Pedido feito", "done"],
        ["Aguardando pagamento", "todo"],
        ["Loja confirmou", "done"],
        ["Em preparo", "current"],
      ])
      const delivered = told({ status: "DELIVERED", payment: charge })
      expect(delivered[1]).toEqual(["Aguardando pagamento", "todo"])
      expect(delivered.filter(([, state]) => state === "done")).toHaveLength(5)
    })

    it("still says approved of a payment refunded since: the payment box tells of the refund", () => {
      expect(told({ payment: { ...paid, status: "REFUNDED" } })[1]).toEqual(["Pagamento aprovado", "done"])
      expect(told({ payment: { ...paid, status: "PARTIALLY_REFUNDED" } })[1]).toEqual(["Pagamento aprovado", "done"])
    })
  })
})
