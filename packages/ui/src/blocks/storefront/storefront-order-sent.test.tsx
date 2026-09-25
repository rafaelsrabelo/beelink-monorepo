// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderSent } from "./storefront-order-sent"

describe("StorefrontOrderSent", () => {
  it("says the order went, and keeps the link for a second try", () => {
    render(<StorefrontOrderSent href="https://wa.me/5511?text=pedido" continueHref="/loja/produtos" />)

    expect(screen.getByRole("status")).toHaveTextContent("Seu pedido foi para o WhatsApp da loja.")
    expect(screen.getByRole("link", { name: /Tente de novo/ })).toHaveAttribute("href", "https://wa.me/5511?text=pedido")
    expect(screen.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/loja/produtos")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderSent href="#" continueHref="#" />)

    await expectNoA11yViolations(container)
  })
})
