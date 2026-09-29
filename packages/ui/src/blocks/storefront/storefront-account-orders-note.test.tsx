// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountOrdersNote } from "./storefront-account-orders-note"

describe("StorefrontAccountOrdersNote", () => {
  it("tells how the last order ended, and leads to the list", () => {
    render(
      <StorefrontAccountOrdersNote
        kind="last"
        order={{ number: 12, headline: "Cancelado em 27 de set. de 2026", detail: "Cancelado por você", tone: "cancelled" }}
        href="/loja/conta/pedidos"
      />,
    )

    expect(screen.getByRole("heading", { level: 2, name: "Seu último pedido" })).toBeInTheDocument()
    expect(screen.getByText("Pedido nº 12")).toBeInTheDocument()
    expect(screen.getByText("Cancelado em 27 de set. de 2026")).toBeInTheDocument()
    expect(screen.getByText("Cancelado por você")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver meus pedidos" })).toHaveAttribute("href", "/loja/conta/pedidos")
  })

  it("invites a shopper who never ordered to the shelf", () => {
    render(<StorefrontAccountOrdersNote kind="none" href="/loja/produtos" />)

    expect(screen.getByText("Você ainda não fez pedidos nesta loja.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir às compras" })).toHaveAttribute("href", "/loja/produtos")
  })

  /** A failed read told as "no orders" would be a lie about the shopper's own orders. */
  it("says the orders could not be read, never that there are none", () => {
    render(<StorefrontAccountOrdersNote kind="unavailable" href="/loja/conta" />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar seus pedidos agora.")
    expect(screen.queryByText("Você ainda não fez pedidos nesta loja.")).toBeNull()
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/loja/conta")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAccountOrdersNote kind="last" order={{ number: 3, headline: "Entregue em 26 de set. de 2026", detail: null, tone: "done" }} href="#" />)
    await expectNoA11yViolations(container)
  })
})
