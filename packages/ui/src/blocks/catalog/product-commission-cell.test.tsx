// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductCommissionCell } from "./product-commission-cell"

describe("ProductCommissionCell (IMPULSEIA-102)", () => {
  it("says the product's own rate, 0 included, and leads to it, named by the product", async () => {
    const onEdit = vi.fn()
    const { container, rerender } = render(<ProductCommissionCell name="Whey" rateBps={2500} defaultRateBps={1000} onEdit={onEdit} />)

    await userEvent.click(screen.getByRole("button", { name: "Editar comissão de afiliado: Whey" }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(screen.getByRole("button")).toHaveTextContent("25%")
    await expectNoA11yViolations(container)

    rerender(<ProductCommissionCell name="Whey" rateBps={0} defaultRateBps={1000} onEdit={onEdit} />)
    expect(screen.getByRole("button")).toHaveTextContent("0%")
  })

  it("says the default table's rate for a product with none of its own", () => {
    render(<ProductCommissionCell name="Creatina" rateBps={null} defaultRateBps={1000} onEdit={() => {}} disabled messages={en} locale="en" />)

    expect(screen.getByRole("button", { name: "Edit affiliate commission: Creatina" })).toBeDisabled()
    expect(screen.getByRole("button")).toHaveTextContent("10% · default")
  })
})
