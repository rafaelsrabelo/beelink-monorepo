// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { discountPercent, formatCents, StorefrontPrice } from "./storefront-price"

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

describe("StorefrontPrice", () => {
  it("shows the price alone when there is no discount", () => {
    render(<StorefrontPrice priceCents={22500} compareAtPriceCents={null} locale="pt-BR" />)

    expect(screen.getByText(/225,00/)).toBeInTheDocument()
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("strikes the old price and states the saving", () => {
    render(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" />)

    expect(screen.getByText(/249,00/).tagName).toBe("S")
    expect(screen.getByText("-24%")).toBeInTheDocument()
  })

  /** A "discount" that raises the price is a data error, not a badge. */
  it("says nothing when the old price is not higher", () => {
    render(<StorefrontPrice priceCents={24900} compareAtPriceCents={18900} locale="pt-BR" />)

    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("can be asked for the numbers without the badge", () => {
    render(<StorefrontPrice priceCents={18900} compareAtPriceCents={24900} locale="pt-BR" showBadge={false} />)

    expect(screen.getByText(/249,00/)).toBeInTheDocument()
    expect(screen.queryByText("-24%")).not.toBeInTheDocument()
  })
})
