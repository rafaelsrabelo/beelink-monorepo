// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrdersEmpty } from "./storefront-orders-empty"
import { StorefrontOrdersLink } from "./storefront-orders-link"

describe("StorefrontOrdersEmpty", () => {
  it("sends a shopper who never ordered to the shelf, and one whose filters found nothing back to the whole list", () => {
    const { rerender } = render(<StorefrontOrdersEmpty variant="none" href="/loja/produtos" />)
    expect(screen.getByText("Você ainda não fez pedidos nesta loja.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ir às compras" })).toHaveAttribute("href", "/loja/produtos")

    rerender(<StorefrontOrdersEmpty variant="filtered" href="/loja/conta/pedidos" />)
    expect(screen.getByText("Nenhum pedido com esses filtros.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Limpar filtros" })).toHaveAttribute("href", "/loja/conta/pedidos")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrdersEmpty variant="none" href="#" />)
    await expectNoA11yViolations(container)
  })
})

describe("StorefrontOrdersLink", () => {
  it("leads to the shopper's orders under a two-line label, named as one", () => {
    render(<StorefrontOrdersLink href="/loja/conta/pedidos" />)

    const link = screen.getByRole("link", { name: "Meus pedidos" })
    expect(link).toHaveAttribute("href", "/loja/conta/pedidos")
    expect(link).toHaveTextContent("Acompanhar")
  })
})
