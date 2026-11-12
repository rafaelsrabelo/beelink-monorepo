// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PRODUCT_COMMISSION_FIELD_ID, ProductCommissionField } from "./product-commission-field"
import { EMPTY_PRODUCT } from "./product-form-types"

describe("ProductCommissionField (IMPULSEIA-102)", () => {
  it("edits the product's commission, and says the default table's rate an empty field follows", async () => {
    const onChange = vi.fn()
    const { container } = render(<ProductCommissionField value={EMPTY_PRODUCT} onChange={onChange} defaultRate="10%" />)

    const field = screen.getByLabelText("Comissão de afiliado (%)")
    expect(field).toHaveAttribute("id", PRODUCT_COMMISSION_FIELD_ID)
    expect(field).toHaveAccessibleDescription(/Vazio, segue a tabela Padrão: 10%\. Com 0, este produto não paga comissão\./)
    await userEvent.type(field, "5")
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_PRODUCT, commission: "5" })
    await expectNoA11yViolations(container)
  })

  it("says what to correct in place of the help", () => {
    render(<ProductCommissionField value={{ ...EMPTY_PRODUCT, commission: "120" }} onChange={() => {}} defaultRate="10%" errors={{ commission: { message: "Informe um percentual de 0% a 100%, ou deixe vazio." } }} />)

    expect(screen.getByText("Informe um percentual de 0% a 100%, ou deixe vazio.")).toBeInTheDocument()
    expect(screen.getByLabelText("Comissão de afiliado (%)")).toHaveAttribute("aria-invalid", "true")
  })
})
