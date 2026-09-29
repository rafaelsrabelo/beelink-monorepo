// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOrder } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { orderStepsOf } from "./order-steps"

const context = { locale: "pt-BR", messages: ptBR }

const order = (over: Partial<Pick<CustomerOrder, "status" | "fulfillment" | "placedAt" | "events">>) => ({
  status: "PREPARING" as const,
  fulfillment: "DELIVERY" as const,
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
  })
})
