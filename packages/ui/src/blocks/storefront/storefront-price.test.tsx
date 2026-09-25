// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { discountPercent, formatCents, priceParts, StorefrontDiscountBadge, StorefrontPrice } from "./storefront-price"

describe("formatCents", () => {
  /** Cents, always. A float here is a price that is a cent out on a hundredth of the orders. */
  it.each([
    [18900, "R$ 189,00"],
    [2500, "R$ 25,00"],
    [0, "R$ 0,00"],
    [1, "R$ 0,01"],
  ])("renders %i cents as %s", (cents, shown) => {
    expect(formatCents(cents, "pt-BR", "BRL").replace(/ /g, " ")).toBe(shown)
  })

  it("lets the reader's language place the currency, not this file", () => {
    expect(formatCents(18900, "en-US", "USD")).toBe("$189.00")
  })
})

describe("discountPercent", () => {
  /**
   * Rounded down, so 49.6% never advertises itself as 50%. The shop is making a claim about money
   * and the rounding must never be in its favour.
   */
  it.each([
    [18900, 24900, 24],
    [13900, 17900, 22],
    [5040, 10000, 49],
  ])("reads %i from %i as -%i%%", (price, compareAt, percent) => {
    expect(discountPercent(price, compareAt)).toBe(percent)
  })
})

describe("priceParts", () => {
  it("splits from the formatter's parts, so the grouping and the currency's place survive", () => {
    expect(priceParts(129990, "pt-BR", "BRL")).toEqual({ currency: "R$", integer: "1.299", fraction: "90" })
    expect(priceParts(890, "pt-BR", "BRL")).toEqual({ currency: "R$", integer: "8", fraction: "90" })
    expect(priceParts(18900, "en-US", "USD")).toEqual({ currency: "$", integer: "189", fraction: "00" })
  })
})

describe("StorefrontPrice", () => {
  it("draws the pieces for the eye and reads the whole price once", () => {
    const { container } = render(<StorefrontPrice priceCents={129990} compareAtPriceCents={null} locale="pt-BR" />)

    const hidden = container.querySelector("[aria-hidden='true']")!
    expect([...hidden.querySelectorAll("span")].map((span) => span.textContent)).toEqual(["R$", "1.299", "90"])
    expect(container.querySelector(".sr-only")!.textContent!.replace(/\u00a0/g, " ")).toBe("R$ 1.299,90")
  })

  it("puts the old price beside the card's, struck through, and under the product's, after \"De:\"", () => {
    const { rerender } = render(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" size="card" />)
    expect(screen.getByText(/249,00/).tagName).toBe("S")
    expect(screen.queryByText("-24%")).not.toBeInTheDocument()

    rerender(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" size="product" />)
    expect(screen.getByText("-24%")).toBeInTheDocument()
    expect(screen.getByText(/De:/)).toHaveTextContent(/249,00/)
  })

  /** A "discount" that raises the price is a data error, not a badge. */
  it("says nothing when the old price is not higher", () => {
    render(<StorefrontPrice priceCents={24900} compareAtPriceCents={18900} locale="pt-BR" size="product" />)

    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
    expect(screen.queryByText(/De:/)).not.toBeInTheDocument()
  })

  it("can be asked for the numbers without the saving", () => {
    render(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" size="product" showBadge={false} />)

    expect(screen.getByText(/249,00/)).toBeInTheDocument()
    expect(screen.queryByText("-24%")).not.toBeInTheDocument()
  })

  it("is one string in the compact size, and the buy box shows the price alone", () => {
    const { rerender } = render(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" size="compact" />)
    expect(screen.getByText(/189,00/)).toBeInTheDocument()

    rerender(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" size="buyBox" />)
    expect(screen.queryByText(/249,00/)).not.toBeInTheDocument()
  })
})

describe("StorefrontDiscountBadge", () => {
  it("states the saving over a photo, rounded down, and nothing without one", () => {
    const { container, rerender } = render(<StorefrontDiscountBadge priceCents={18900} compareAtPriceCents={24900} />)
    expect(screen.getByText("-24%")).toHaveClass("bg-shop-sale", "text-shop-on-sale", "right-2.5")

    rerender(<StorefrontDiscountBadge priceCents={18900} compareAtPriceCents={24900} placement="photo" />)
    expect(screen.getByText("-24%")).toHaveClass("left-3.5")

    rerender(<StorefrontDiscountBadge priceCents={18900} compareAtPriceCents={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
