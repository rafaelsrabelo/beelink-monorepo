// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCartTotals } from "./storefront-cart-totals"

const rows = (container: HTMLElement) => [...container.querySelectorAll("dl > div")].map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.textContent!.replace(/\s/g, " ")])
const coupon = [{ key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 11,98" }]

describe("StorefrontCartTotals", () => {
  it("is the subtotal alone, with nothing taken off or added", () => {
    const { container } = render(<StorefrontCartTotals subtotalCents={11980} count={2} locale="pt-BR" />)

    expect(rows(container)).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
  })

  it("puts the delivery and what was taken off on rows of their own, and the total under them", () => {
    const { container } = render(<StorefrontCartTotals subtotalCents={11980} count={2} delivery="R$ 5,00" discounts={coupon} total="R$ 112,82" locale="pt-BR" />)

    expect(rows(container)).toEqual([
      ["Subtotal (2 itens)", "R$ 119,80"],
      ["Entrega", "R$ 5,00"],
      ["Cupom BEMVINDO10", "− R$ 11,98"],
      ["Total", "R$ 112,82"],
    ])
  })

  it("calls the total an estimate on the cart's page, where the delivery is not chosen yet", () => {
    render(<StorefrontCartTotals subtotalCents={11980} count={2} discounts={coupon} total="R$ 107,82" estimated locale="pt-BR" />)

    expect(screen.getByText("Total estimado")).toBeInTheDocument()
    expect(screen.queryByText("Total")).toBeNull()
  })

  it("waits as a skeleton for its first price, and says nothing under it meanwhile", () => {
    const { container } = render(<StorefrontCartTotals subtotalCents={11980} count={2} discounts={coupon} total="R$ 107,82" cashback="Você ganha R$ 5,39 de cashback." pricing locale="pt-BR" />)

    expect(container.querySelector("dl")).toHaveAttribute("aria-busy", "true")
    expect(container).not.toHaveTextContent("119,80")
    expect(screen.queryByText(/cashback/)).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCartTotals subtotalCents={11980} count={2} discounts={coupon} total="R$ 107,82" offer={{ tone: "open", text: "Primeira compra: − R$ 10,00." }} locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
