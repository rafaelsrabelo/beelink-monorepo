// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import type { CartCouponRow } from "../../lib/shop-offers"
import { StorefrontCartCoupons } from "./storefront-cart-coupons"

const coupons: CartCouponRow[] = [
  { code: "DEZ", benefit: "10% de desconto", conditions: [], missing: null },
  { code: "PRIMEIRA10", benefit: "10% de desconto", conditions: ["Pedido mínimo de R$ 50,00", "Só no primeiro pedido"], missing: null },
  { code: "ACIMA150", benefit: "R$ 20,00 de desconto", conditions: ["Pedido mínimo de R$ 150,00"], missing: "Faltam R$ 60,00 em produtos para usar." },
]

const rowOf = (code: string) => screen.getByText(code).closest("li")!

describe("StorefrontCartCoupons", () => {
  // At most shops and for most customers there is none: no heading over an empty list.
  it("draws nothing at all without a coupon to show", () => {
    const { container } = render(<StorefrontCartCoupons coupons={[]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("lists each under \"Cupons disponíveis\", with its code, what it gives and what it asks for", () => {
    render(<StorefrontCartCoupons coupons={coupons} />)

    const section = screen.getByRole("region", { name: "Cupons disponíveis" })
    expect(within(section).getAllByRole("listitem")).toHaveLength(3)
    expect(rowOf("PRIMEIRA10")).toHaveTextContent("10% de desconto · Pedido mínimo de R$ 50,00 · Só no primeiro pedido")
  })

  it("applies the one pressed, by its code, from a button named for it", async () => {
    const onApply = vi.fn()
    render(<StorefrontCartCoupons coupons={coupons} onApply={onApply} />)

    await userEvent.click(screen.getByRole("button", { name: "Aplicar o cupom PRIMEIRA10" }))

    expect(onApply).toHaveBeenCalledWith("PRIMEIRA10")
    expect(screen.getByRole("button", { name: "Aplicar o cupom DEZ" })).toHaveClass("h-11")
  })

  // A press would be refused: the row says by how much the cart is short instead of offering it.
  it("offers no press on one the cart is below the minimum of, and says what is missing", () => {
    render(<StorefrontCartCoupons coupons={coupons} />)

    expect(within(rowOf("ACIMA150")).queryByRole("button")).toBeNull()
    expect(rowOf("ACIMA150")).toHaveTextContent("Faltam R$ 60,00 em produtos para usar.")
  })

  it("marks the one in force, whatever the case it was typed in, and does not offer it again", () => {
    render(<StorefrontCartCoupons coupons={coupons} applied="dez" />)

    expect(within(rowOf("DEZ")).queryByRole("button")).toBeNull()
    expect(rowOf("DEZ")).toHaveTextContent("Aplicado")
    expect(screen.getByRole("button", { name: "Aplicar o cupom PRIMEIRA10" })).toBeEnabled()
  })

  it("lets nothing be pressed while a code is checked or the order is on its way", () => {
    render(<StorefrontCartCoupons coupons={coupons} disabled />)

    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<StorefrontCartCoupons coupons={coupons} applied="DEZ" messages={en} />)

    expect(screen.getByRole("region", { name: "Available coupons" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Apply the coupon PRIMEIRA10" })).toHaveTextContent("Apply")
    expect(rowOf("DEZ")).toHaveTextContent("Applied")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCartCoupons coupons={coupons} applied="DEZ" onApply={() => {}} />)

    await expectNoA11yViolations(container)
  })
})
