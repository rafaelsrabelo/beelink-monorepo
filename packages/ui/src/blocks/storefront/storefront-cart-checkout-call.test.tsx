// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCartCheckoutCall } from "./storefront-cart-checkout-call"

describe("StorefrontCartCheckoutCall", () => {
  it("leads to the checkout, says the delivery is priced there, and how the total splits", () => {
    render(<StorefrontCartCheckoutCall href="/loja/checkout?cupom=BEMVINDO10" installments="em até 6x de R$ 19,96 sem juros" />)

    expect(screen.getByRole("link", { name: "Finalizar compra" })).toHaveAttribute("href", "/loja/checkout?cupom=BEMVINDO10")
    expect(screen.getByText("Frete calculado no checkout.")).toBeInTheDocument()
    expect(screen.getByText("em até 6x de R$ 19,96 sem juros")).toBeInTheDocument()
  })

  it("draws the button pressed down, and no link, with nothing to order", () => {
    render(<StorefrontCartCheckoutCall href="/loja/checkout" disabled />)

    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByRole("button", { name: "Finalizar compra" })).toBeDisabled()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCartCheckoutCall href="/loja/checkout" installments="em até 6x de R$ 19,96 sem juros" />)

    await expectNoA11yViolations(container)
  })
})
