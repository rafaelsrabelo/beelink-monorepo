// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCartLink } from "./storefront-cart-link"

describe("StorefrontCartLink", () => {
  it("says the count in the link's name, and draws the badge only when there is one", () => {
    const { container, rerender } = render(<StorefrontCartLink href="/loja/carrinho" />)

    expect(screen.getByRole("link", { name: "Carrinho, 0 itens" })).toHaveAttribute("href", "/loja/carrinho")
    expect(container.querySelector("[aria-hidden='true'].rounded-full")).toBeNull()

    rerender(<StorefrontCartLink href="/loja/carrinho" count={1} />)
    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeInTheDocument()

    rerender(<StorefrontCartLink href="/loja/carrinho" count={140} />)
    expect(screen.getByRole("link", { name: "Carrinho, 140 itens" })).toHaveTextContent("99+")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCartLink href="/loja/carrinho" count={3} />)

    await expectNoA11yViolations(container)
  })
})
