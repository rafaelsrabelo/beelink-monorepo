// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorePaymentMethodsFields } from "./store-payment-methods-fields"

function renderFields(
  overrides: Partial<Parameters<typeof StorePaymentMethodsFields>[0]> = {},
) {
  const onChange = vi.fn()
  render(<StorePaymentMethodsFields value={["PIX"]} onChange={onChange} {...overrides} />)
  return { onChange }
}

describe("StorePaymentMethodsFields", () => {
  it("ticks what the shop already takes", () => {
    renderFields()

    expect(screen.getByRole("checkbox", { name: "PIX" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Dinheiro" })).not.toBeChecked()
  })

  it("adds a method in the order the column declares, not the order it was ticked", async () => {
    const { onChange } = renderFields()

    await userEvent.click(screen.getByRole("checkbox", { name: "Dinheiro" }))

    expect(onChange).toHaveBeenCalledWith(["MONEY", "PIX"])
  })

  it("removes a method that is unticked", async () => {
    const { onChange } = renderFields({ value: ["MONEY", "PIX"] })

    await userEvent.click(screen.getByRole("checkbox", { name: "PIX" }))

    expect(onChange).toHaveBeenCalledWith(["MONEY"])
  })

  it("renders the verdict when the shop would take nothing at all", () => {
    renderFields({ value: [], error: { message: "Escolha ao menos uma forma de pagamento" } })

    expect(screen.getByRole("alert")).toHaveTextContent("Escolha ao menos uma forma de pagamento")
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderFields({ messages: en })

    expect(screen.getByRole("checkbox", { name: "Cash" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorePaymentMethodsFields
        value={[]}
        onChange={vi.fn()}
        error={{ message: "Escolha ao menos uma forma de pagamento" }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
