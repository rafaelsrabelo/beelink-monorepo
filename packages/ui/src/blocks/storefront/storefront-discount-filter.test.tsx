// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontDiscountFilter } from "./storefront-discount-filter"

const ranges = [
  { percent: 10, href: "/loja/produtos?desconto=10", count: 12, selected: false },
  { percent: 20, href: "/loja/produtos", count: 5, selected: true },
]

describe("StorefrontDiscountFilter", () => {
  it("offers 'Em promoção' as a box and each minimum cut as a link with its count", () => {
    render(<StorefrontDiscountFilter onSale={{ href: "/loja/produtos?desconto=1", count: 14, selected: false }} ranges={ranges} locale="pt-BR" />)

    expect(screen.getByRole("heading", { level: 3, name: "Desconto" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Em promoção (14)" })).toHaveAttribute("aria-checked", "false")
    expect(screen.getByRole("link", { name: "10% ou mais (12)" })).toHaveAttribute("href", "/loja/produtos?desconto=10")
    expect(screen.getByRole("link", { name: "20% ou mais (5)" })).toHaveAttribute("aria-current", "true")
  })

  it("draws nothing when nothing on the shelf is on sale", () => {
    const { container } = render(<StorefrontDiscountFilter onSale={null} ranges={[]} locale="pt-BR" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontDiscountFilter onSale={{ href: "#", count: 14, selected: true }} ranges={ranges} locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
