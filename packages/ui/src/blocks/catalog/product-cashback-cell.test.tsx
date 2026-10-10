// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductCashbackCell } from "./product-cashback-cell"

describe("ProductCashbackCell (BEELINK-313)", () => {
  it("says the product's rate as a percentage, and offers nothing to add", async () => {
    const { container } = render(<ProductCashbackCell name="Whey" rateBps={250} onAdd={() => {}} />)

    expect(screen.getByText("2,5%")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    await expectNoA11yViolations(container)
  })

  it("offers to add one to a product with none, named by the product", async () => {
    const onAdd = vi.fn()
    const { container, rerender } = render(<ProductCashbackCell name="Creatina" rateBps={null} onAdd={onAdd} />)

    await userEvent.click(screen.getByRole("button", { name: "Adicionar cashback: Creatina" }))
    expect(onAdd).toHaveBeenCalledOnce()
    await expectNoA11yViolations(container)

    rerender(<ProductCashbackCell name="Creatina" rateBps={null} onAdd={onAdd} disabled messages={en} />)
    expect(screen.getByRole("button", { name: "Add cashback: Creatina" })).toBeDisabled()
  })
})
