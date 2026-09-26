// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerStats } from "./customer-stats"
import { customerRecord } from "./customers.fixtures"

/** Each figure's label and value, in the order they are drawn; Intl's no-break space read as a space. */
function figures(): [string, string][] {
  const section = screen.getByRole("region", { name: "Números" })
  const read = (node: HTMLElement) => (node.textContent ?? "").replace(/\s/g, " ")
  const terms = within(section).getAllByRole("term").map(read)
  const values = within(section).getAllByRole("definition").map(read)
  return terms.map((term, index) => [term, values[index] ?? ""])
}

describe("CustomerStats", () => {
  it("draws the API's figures: orders, spend and average ticket to the cent, the first and latest order and the days since", () => {
    render(<CustomerStats customer={customerRecord} />)

    expect(figures()).toEqual([
      ["Pedidos", "3"],
      ["Total gasto", "R$ 368,70"],
      ["Ticket médio", "R$ 122,90"],
      ["Primeiro pedido", "13 de jul. de 2026"],
      ["Último pedido", "20 de set. de 2026"],
      ["Dias sem comprar", "5"],
    ])
  })

  it("draws a dash where a lead has nothing to show, never a zero average", () => {
    render(
      <CustomerStats
        customer={{ ordersCount: 0, totalSpentCents: 0, averageTicketCents: null, firstOrderAt: null, lastOrderAt: null, daysSinceLastOrder: null }}
      />,
    )

    expect(figures()).toEqual([
      ["Pedidos", "0"],
      ["Total gasto", "R$ 0,00"],
      ["Ticket médio", "—"],
      ["Primeiro pedido", "—"],
      ["Último pedido", "—"],
      ["Dias sem comprar", "—"],
    ])
  })

  it("speaks the panel's language", () => {
    render(<CustomerStats customer={customerRecord} locale="en" messages={en} />)

    expect(screen.getByRole("region", { name: "Figures" })).toHaveTextContent("Average order")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CustomerStats customer={customerRecord} />)

    await expectNoA11yViolations(container)
  })
})
