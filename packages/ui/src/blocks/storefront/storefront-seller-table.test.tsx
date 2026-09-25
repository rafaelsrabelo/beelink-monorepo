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
  it("writes 5b's order whatever order the shop stores, with credit and debit as one 'Cartão'", () => {
    expect(paymentsLineOf(["MONEY", "PIX", "CREDIT_CARD", "DEBIT_CARD"], labels)).toBe("Pix · Cartão · Dinheiro")
    expect(paymentsLineOf(["DEBIT_CARD", "MONEY"], labels)).toBe("Cartão · Dinheiro")
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
