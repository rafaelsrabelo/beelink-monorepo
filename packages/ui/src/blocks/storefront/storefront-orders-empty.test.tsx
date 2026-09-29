// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrdersEmpty } from "./storefront-orders-empty"

describe("StorefrontOrdersEmpty", () => {
  it("sends a shopper who never ordered to the shelf, and one whose filters found nothing back to the whole list", () => {
    const { rerender } = render(<StorefrontOrdersEmpty variant="none" href="/loja/produtos" />)
    expect(screen.getByText("Você ainda não fez pedidos nesta loja.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir às compras" })).toHaveAttribute("href", "/loja/produtos")

    rerender(<StorefrontOrdersEmpty variant="filtered" href="/loja/conta/pedidos" />)
    expect(screen.getByText("Nenhum pedido com esses filtros.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/loja/conta/pedidos")
  })

  /** A list that failed to load is not a list with nothing in it: saying "none" would be a lie about their orders. */
  it("says a list that could not be read failed, and offers to read it again", () => {
    render(<StorefrontOrdersEmpty variant="unavailable" href="/loja/conta/pedidos?situacao=entregues" />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar seus pedidos agora.")
    expect(screen.queryByText("Nenhum pedido com esses filtros.")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/loja/conta/pedidos?situacao=entregues")
  })

  it("has no accessibility violations", async () => {
    const { container, rerender } = render(<StorefrontOrdersEmpty variant="none" href="#" />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontOrdersEmpty variant="unavailable" href="#" />)
    await expectNoA11yViolations(container)
  })
})
