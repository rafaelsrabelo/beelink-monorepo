// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCartLink } from "./storefront-cart-link"
import { StorefrontCheckoutBar } from "./storefront-checkout-bar"

const bag = <StorefrontCartLink href="/loja/carrinho" count={3} />

describe("StorefrontCheckoutBar", () => {
  it("is the logo, back to the shop, and the bag, back to the cart — no search and no menu", () => {
    render(<StorefrontCheckoutBar name="Mutante" logoUrl="/logo.png" homeHref="/loja" cart={bag} />)

    expect(screen.getByRole("link", { name: "Mutante" })).toHaveAttribute("href", "/loja")
    expect(screen.getByRole("link", { name: "Carrinho, 3 itens" })).toHaveAttribute("href", "/loja/carrinho")
    expect(screen.getByText("Compra segura")).toBeInTheDocument()
    expect(screen.queryByRole("search")).toBeNull()
    expect(screen.queryByRole("navigation")).toBeNull()
    expect(screen.getAllByRole("link")).toHaveLength(2)
  })

  it("says the shop's name where it has no logo", () => {
    render(<StorefrontCheckoutBar name="Mutante" homeHref="/loja" cart={bag} />)

    expect(screen.getByRole("link", { name: "Mutante" })).toHaveTextContent("Mutante")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCheckoutBar name="Mutante" homeHref="/loja" cart={bag} />)

    await expectNoA11yViolations(container)
  })
})
