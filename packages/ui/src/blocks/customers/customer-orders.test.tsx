// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomerOrders } from "./customer-orders"
import { customerOrders } from "./customers.fixtures"

const hrefOf = (number: number) => `/admin/loja/orders/${number}`

describe("CustomerOrders", () => {
  it("lists every order in the order given, each with its date, units, payment, total to the cent and status", () => {
    render(<CustomerOrders orders={customerOrders} hrefOf={hrefOf} />)

    const [latest, cancelled] = screen.getAllByRole("listitem")
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(latest).toHaveTextContent("#14")
    expect(latest).toHaveTextContent("20 de set.")
    expect(latest).toHaveTextContent("2 itens · Pix")
    expect(latest).toHaveTextContent("R$ 179,80")
    expect(latest).toHaveTextContent("Em preparo")
    expect(cancelled).toHaveTextContent("1 item · Dinheiro")
    expect(cancelled).toHaveTextContent("Cancelado")
  })

  it("leads each order to its own page, the link named for the order", () => {
    render(<CustomerOrders orders={customerOrders} hrefOf={hrefOf} />)

    const link = screen.getByRole("link", { name: "Abrir o pedido #14" })
    expect(link).toHaveAttribute("href", "/admin/loja/orders/14")
    expect(link).toHaveTextContent(/^#14$/)
  })

  it("says the year of an order from another year", () => {
    render(<CustomerOrders orders={[{ ...customerOrders[0]!, placedAt: "2024-03-02T15:00:00.000Z" }]} hrefOf={hrefOf} />)

    expect(screen.getByRole("listitem")).toHaveTextContent("2024")
  })

  it("says there is no order yet, and draws rows of skeleton while the first page arrives", () => {
    const { container, rerender } = render(<CustomerOrders orders={[]} hrefOf={hrefOf} />)
    expect(screen.getByText("Nenhum pedido ainda.")).toBeInTheDocument()

    rerender(<CustomerOrders orders={[]} loading hrefOf={hrefOf} />)
    expect(screen.queryByText("Nenhum pedido ainda.")).not.toBeInTheDocument()
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0)
  })

  it("draws the pager it is given under the rows", () => {
    render(<CustomerOrders orders={customerOrders} hrefOf={hrefOf} pager={<nav aria-label="Páginas" />} />)

    expect(within(screen.getByRole("region", { name: "Histórico de pedidos" })).getByRole("navigation", { name: "Páginas" })).toBeInTheDocument()
  })

  it("speaks the panel's language", () => {
    render(<CustomerOrders orders={customerOrders} hrefOf={hrefOf} locale="en" messages={en} />)

    expect(screen.getByRole("region", { name: "Order history" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Open order #14" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<CustomerOrders orders={customerOrders} hrefOf={hrefOf} />)

    await expectNoA11yViolations(container)
  })
})
