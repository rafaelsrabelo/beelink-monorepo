// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderSteps, type StorefrontOrderStep } from "./storefront-order-steps"

const steps: StorefrontOrderStep[] = [
  { label: "Pedido feito", when: "27 de set., 14:02", state: "done" },
  { label: "Loja confirmou", when: "27 de set., 15:10", state: "done" },
  { label: "Em preparo", when: "28 de set., 09:00", state: "current" },
  { label: "Saiu para entrega", when: null, state: "todo" },
  { label: "Entregue", when: null, state: "todo" },
]

describe("StorefrontOrderSteps", () => {
  it("lists the steps in order, with the moment of each one taken", () => {
    render(<StorefrontOrderSteps steps={steps} />)

    const list = screen.getByRole("list", { name: "Etapas do pedido" })
    const items = within(list).getAllByRole("listitem")
    expect(items).toHaveLength(5)
    expect(items[0]).toHaveTextContent("Pedido feito")
    expect(items[0]).toHaveTextContent("27 de set., 14:02")
    expect(items[4]).toHaveTextContent("Entregue")
  })

  /** The marks tell the eye; a screen reader is told in words, and the step it is at is the list's current one. */
  it("marks the step the order is at, and says which are done and which wait", () => {
    render(<StorefrontOrderSteps steps={steps} />)

    const items = screen.getAllByRole("listitem")
    expect(items[2]).toHaveAttribute("aria-current", "step")
    expect(items.filter((item) => item.hasAttribute("aria-current"))).toHaveLength(1)
    expect(items[0]).toHaveTextContent("Pedido feito, concluída")
    expect(items[3]).toHaveTextContent("Saiu para entrega, a seguir")
  })

  /** BEELINK-207: an order charged online has its payment as a step; one the shop moved past unpaid still waits, between steps done. */
  it("draws a payment step still waiting between steps done, and says so", () => {
    const paidLater: StorefrontOrderStep[] = [steps[0]!, { label: "Aguardando pagamento", when: null, state: "todo" }, ...steps.slice(1)]
    render(<StorefrontOrderSteps steps={paidLater} />)

    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(6)
    expect(items[1]).toHaveTextContent("Aguardando pagamento, a seguir")
    expect(items[2]).toHaveTextContent("Loja confirmou, concluída")
    expect(items[3]).toHaveAttribute("aria-current", "step")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderSteps steps={steps} />)
    await expectNoA11yViolations(container)
  })
})
