// Libs
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCartCouponCall } from "./storefront-cart-coupon-call"

const call = { message: "Você tem 15% de desconto no primeiro pedido com o cupom", code: "SEJAMUTANTE" }

/** BEELINK-311: the cart's call to a coupon its customer has and did not apply. */
describe("StorefrontCartCouponCall", () => {
  it("says the sentence it was handed, then the code, and offers one primary press named for what it does", () => {
    const { container } = render(<StorefrontCartCouponCall call={call} />)

    expect(container).toHaveTextContent("Você tem 15% de desconto no primeiro pedido com o cupom SEJAMUTANTE")
    const apply = screen.getByRole("button", { name: "Aplicar cupom" })
    // A reader who lands on the button hears which coupon it applies.
    expect(apply).toHaveAccessibleDescription("Você tem 15% de desconto no primeiro pedido com o cupom SEJAMUTANTE")
    // 44px, the whole width, in the shop's primary colour — tokens only.
    expect(apply).toHaveClass("h-11", "w-full", "bg-shop-primary", "text-shop-on-primary")
  })

  it("applies the coupon by its code, in one press — by the pointer or by the keyboard alone", async () => {
    const onApply = vi.fn()
    render(<StorefrontCartCouponCall call={call} onApply={onApply} />)

    await userEvent.click(screen.getByRole("button", { name: "Aplicar cupom" }))
    act(() => (document.activeElement as HTMLElement).blur())
    await userEvent.tab()
    expect(screen.getByRole("button", { name: "Aplicar cupom" })).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard(" ")

    expect(onApply.mock.calls).toEqual([["SEJAMUTANTE"], ["SEJAMUTANTE"], ["SEJAMUTANTE"]])
  })

  // The one place left that says the coupon: nothing closes it but applying one.
  it("has one control, and it is not one that dismisses", () => {
    render(<StorefrontCartCouponCall call={call} />)

    expect(screen.getAllByRole("button")).toHaveLength(1)
  })

  it("says it is checking, and takes no second press meanwhile", async () => {
    const onApply = vi.fn()
    render(<StorefrontCartCouponCall call={call} pending onApply={onApply} />)

    const apply = screen.getByRole("button", { name: "Conferindo…" })
    expect(apply).toBeDisabled()
    expect(apply).toHaveAttribute("aria-busy", "true")
    await userEvent.click(apply)
    expect(onApply).not.toHaveBeenCalled()
  })

  it("is not pressed while the order is on its way", () => {
    render(<StorefrontCartCouponCall call={call} disabled />)

    expect(screen.getByRole("button", { name: "Aplicar cupom" })).toBeDisabled()
  })

  // Never cut in the middle while it fits a line of its own: "SEJ / AMUTANTE" is not a code anyone can read.
  it("keeps a long code inside its box, and a short one whole", () => {
    render(<StorefrontCartCouponCall call={{ ...call, code: "UMCODIGOBEMCOMPRIDODETRINTACAR" }} />)

    const code = screen.getByText("UMCODIGOBEMCOMPRIDODETRINTACAR")
    expect(code).toHaveClass("break-words")
    expect(code).not.toHaveClass("break-all")
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    render(<StorefrontCartCouponCall call={{ message: "You have 15% off on your first order with the coupon", code: "SEJAMUTANTE" }} messages={en} />)

    expect(screen.getByRole("button", { name: "Apply coupon" })).toBeInTheDocument()
  })

  it("has no accessibility violations, at rest and while checking", async () => {
    const { container, rerender } = render(<StorefrontCartCouponCall call={call} />)
    await expectNoA11yViolations(container)

    rerender(<StorefrontCartCouponCall call={call} pending />)
    await expectNoA11yViolations(container)
  })
})
