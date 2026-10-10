// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PRODUCT_CASHBACK_FIELD_ID, ProductCashbackField } from "./product-cashback-field"
import { EMPTY_PRODUCT } from "./product-form-types"

describe("ProductCashbackField (BEELINK-313)", () => {
  it("asks the product's rate in a card of its own, saying what an empty field means", async () => {
    const onChange = vi.fn()
    const { container } = render(<ProductCashbackField value={EMPTY_PRODUCT} onChange={onChange} />)

    expect(screen.getByRole("heading", { name: "Cashback" })).toBeInTheDocument()
    expect(screen.getByText(/Vazio, este produto não gera cashback/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Cashback deste produto (%)"), "5")
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_PRODUCT, cashback: "5" })
    await expectNoA11yViolations(container)
  })

  it("says its refusal in place of the help, under the id the products' list sends to", async () => {
    const { container } = render(<ProductCashbackField value={{ ...EMPTY_PRODUCT, cashback: "150" }} onChange={() => {}} errors={{ cashback: { message: "Informe um percentual entre 0,01% e 100%, ou deixe vazio." } }} />)

    expect(screen.getByLabelText("Cashback deste produto (%)")).toHaveAttribute("id", PRODUCT_CASHBACK_FIELD_ID)
    expect(screen.getByLabelText("Cashback deste produto (%)")).toBeInvalid()
    expect(screen.getByText("Informe um percentual entre 0,01% e 100%, ou deixe vazio.")).toBeInTheDocument()
    expect(screen.queryByText(/Vazio, este produto não gera cashback/)).not.toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
