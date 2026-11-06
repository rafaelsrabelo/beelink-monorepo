// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutLayout } from "./storefront-checkout-layout"

describe("StorefrontCheckoutLayout", () => {
  it("draws the summary first, then the coupon, then the steps — the order a phone reads them in", () => {
    const { container } = render(<StorefrontCheckoutLayout summary={<p>Resumo</p>} controls={<p>Cupom</p>} steps={<p>Etapas</p>} />)

    expect(screen.getByRole("heading", { level: 1, name: "Finalizar compra" })).toBeInTheDocument()
    expect([...container.querySelectorAll("p")].map((node) => node.textContent)).toEqual(["Resumo", "Cupom", "Etapas"])
  })

  it("draws no box for the controls when there are none", () => {
    const { container } = render(<StorefrontCheckoutLayout summary={<p>Resumo</p>} steps={<p>Etapas</p>} />)

    expect(container.querySelectorAll("p")).toHaveLength(2)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCheckoutLayout summary={<p>Resumo</p>} controls={<p>Cupom</p>} steps={<p>Etapas</p>} />)

    await expectNoA11yViolations(container)
  })
})
