// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { OrderList } from "./order-list"
import { orders } from "./orders.fixtures"

const hrefOf = (number: number) => `/admin/loja/orders/${number}`

describe("OrderList", () => {
  it("draws each order with its number, customer, units, total to the cent, payment and status", () => {
    render(<OrderList orders={orders} hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)

    const table = screen.getByRole("table")
    const first = within(table).getAllByRole("row")[1]!
    expect(first).toHaveTextContent("#12")
    expect(first).toHaveTextContent("Bia Souza")
    expect(first).toHaveTextContent("5511988887777")
    expect(first).toHaveTextContent("3 itens")
    expect(first).toHaveTextContent("R$ 244,70")
    expect(first).toHaveTextContent("Pix")
    expect(first).toHaveTextContent("Em preparo")
    expect(within(table).getAllByRole("row")[2]).toHaveTextContent("1 item")
  })

  it("opens an order at its own page, the link named in full", () => {
    render(<OrderList orders={orders} hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)

    // The table's and the cards' — the one CSS does not hide is the one a person meets.
    for (const link of screen.getAllByRole("link", { name: "Abrir o pedido #12, de Bia Souza" })) {
      expect(link).toHaveAttribute("href", "/admin/loja/orders/12")
    }
  })

  it("keeps a card's status, total and phone readable, outside its link", () => {
    render(<OrderList orders={orders} hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)

    const card = screen.getAllByRole("listitem")[0]!
    expect(within(card).getByRole("link")).toHaveTextContent(/^#12$/)
    expect(card).toHaveTextContent("Em preparo")
    expect(card).toHaveTextContent("R$ 244,70")
    expect(card).toHaveTextContent("5511988887777")
  })

  it("says the year of an order from another year", () => {
    const old = { ...orders[0]!, number: 1, placedAt: "2024-03-02T15:00:00.000Z" }
    render(<OrderList orders={[old]} hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)

    expect(within(screen.getByRole("table")).getAllByRole("row")[1]).toHaveTextContent("2024")
  })

  it("invites the first order when there is none, and says nothing matches when a filter is on", () => {
    const { rerender } = render(<OrderList orders={[]} hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)

    expect(screen.getByText("Nenhum pedido ainda.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Registrar pedido" })).toHaveAttribute("href", "/admin/loja/orders/new")

    rerender(<OrderList orders={[]} filtered hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)
    expect(screen.getByText("Nenhum pedido com essa busca ou esse status.")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Registrar pedido" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<OrderList orders={orders} hrefOf={hrefOf} newHref="/admin/loja/orders/new" />)
    await expectNoA11yViolations(container)
  })
})
