// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreAddressFields } from "./store-address-fields"
import { sampleStoreSettingsValues } from "./store.fixtures"

const values = sampleStoreSettingsValues.address

function renderFields(overrides: Partial<Parameters<typeof StoreAddressFields>[0]> = {}) {
  const onChange = vi.fn()
  render(<StoreAddressFields value={values} onChange={onChange} {...overrides} />)
  return { onChange }
}

describe("StoreAddressFields", () => {
  it("hands the whole address back when one field changes", async () => {
    const { onChange } = renderFields()

    await userEvent.type(screen.getByLabelText("Número"), "0")

    expect(onChange).toHaveBeenCalledWith({ ...values, number: `${values.number}0` })
  })

  it("asks the screen to look the postcode up — it never looks it up itself", async () => {
    const onZipCodeLookup = vi.fn()
    renderFields({ onZipCodeLookup })

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))

    expect(onZipCodeLookup).toHaveBeenCalledWith(values.zipCode)
  })

  it("offers no lookup when the screen wired none", () => {
    renderFields()

    expect(screen.queryByRole("button", { name: "Buscar CEP" })).not.toBeInTheDocument()
  })

  it("says the lookup is running and refuses a second click", () => {
    renderFields({ onZipCodeLookup: vi.fn(), lookupPending: true })

    expect(screen.getByRole("button", { name: "Buscando…" })).toBeDisabled()
  })

  it("keeps the state as the two upper-case letters the column stores", async () => {
    const { onChange } = renderFields({ value: { ...values, state: "" } })

    await userEvent.type(screen.getByLabelText("Estado"), "s")

    expect(onChange).toHaveBeenCalledWith({ ...values, state: "S" })
  })

  it("renders the verdicts the screen's form handed it", () => {
    renderFields({ errors: { zipCode: { message: "Informe um CEP com 8 dígitos" } } })

    expect(screen.getByRole("alert")).toHaveTextContent("Informe um CEP com 8 dígitos")
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderFields({ messages: en })

    expect(screen.getByLabelText("Postcode")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreAddressFields
        value={values}
        onChange={vi.fn()}
        onZipCodeLookup={vi.fn()}
        errors={{ zipCode: { message: "Informe um CEP com 8 dígitos" } }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
