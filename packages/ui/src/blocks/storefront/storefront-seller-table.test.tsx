// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { paymentsLineOf, StorefrontSellerTable } from "./storefront-seller-table"

const labels = defaultMessages.storefront.payments

describe("paymentsLineOf", () => {
  it("keeps the shopkeeper's order and makes credit and debit one 'Cartão', where the first of them was", () => {
    expect(paymentsLineOf(["PIX", "CREDIT_CARD", "DEBIT_CARD", "MONEY"], labels)).toBe("Pix · Cartão · Dinheiro")
    expect(paymentsLineOf(["MONEY", "DEBIT_CARD", "PIX"], labels)).toBe("Dinheiro · Cartão · Pix")
    expect(paymentsLineOf([], labels)).toBe("")
  })
})

describe("StorefrontSellerTable", () => {
  it("names the seller and how it is paid, each row headed", () => {
    render(<StorefrontSellerTable sellerName="Mutante Suplementos" paymentMethods={["PIX", "MONEY"]} />)

    expect(screen.getByRole("rowheader", { name: "Vendido por" })).toBeInTheDocument()
    expect(screen.getByRole("cell", { name: "Mutante Suplementos" })).toHaveClass("font-semibold")
    expect(screen.getByRole("cell", { name: "Pix · Dinheiro" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontSellerTable sellerName="Loja" paymentMethods={["PIX"]} />)

    await expectNoA11yViolations(container)
  })
})
