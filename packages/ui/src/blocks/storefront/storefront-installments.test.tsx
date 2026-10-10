// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontInstallments } from "./storefront-installments"

const TERMS = { maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }

describe("StorefrontInstallments", () => {
  it("says how far the price splits, and each instalment", () => {
    render(<StorefrontInstallments priceCents={8990} terms={TERMS} locale="pt-BR" />)

    expect(screen.getByText(/^em até 6x de R\$\s14,98 sem juros$/)).toBeInTheDocument()
  })

  it("draws nothing for a price paid in full only", () => {
    const { container } = render(<StorefrontInstallments priceCents={990} terms={TERMS} locale="pt-BR" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontInstallments priceCents={8990} terms={TERMS} locale="pt-BR" size="product" />)

    await expectNoA11yViolations(container)
  })
})
