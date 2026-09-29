// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrdersLink } from "./storefront-orders-link"

describe("StorefrontOrdersLink", () => {
  it("leads to the shopper's orders under a two-line label, named as one", () => {
    render(<StorefrontOrdersLink href="/loja/conta/pedidos" />)

    const link = screen.getByRole("link", { name: "Meus pedidos" })
    expect(link).toHaveAttribute("href", "/loja/conta/pedidos")
    expect(link).toHaveTextContent("Acompanhar")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrdersLink href="/loja/conta/pedidos" />)
    await expectNoA11yViolations(container)
  })
})
