// Libs
import { render, screen, waitFor } from "@testing-library/react"
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
    const onZipCodeLookup = vi.fn(async () => null)
    renderFields({ onZipCodeLookup })

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))

    expect(onZipCodeLookup).toHaveBeenCalledWith(values.zipCode)
  })

  it("fills the address in with what the lookup answered", async () => {
    const onZipCodeLookup = vi.fn(async () => ({
      zipCode: "01001000",
      street: "Praça da Sé",
      neighborhood: "Sé",
      city: "São Paulo",
      state: "SP",
    }))
    const { onChange } = renderFields({ onZipCodeLookup })

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        ...values,
        street: "Praça da Sé",
        neighborhood: "Sé",
        city: "São Paulo",
        state: "SP",
      }),
    )
  })

  // A town with one postcode for the whole of it answers 200 with a blank street and neighbourhood
  // — 88870-000 and 76890-000 both do. Writing those through erases what the shopkeeper typed.
  it("keeps what is already typed where the answer came back blank", async () => {
    const onZipCodeLookup = vi.fn(async () => ({
      zipCode: "88870000",
      street: "",
      neighborhood: "",
      city: "Sangão",
      state: "SC",
    }))
    const { onChange } = renderFields({
      value: { ...values, street: "Rua que o lojista digitou", neighborhood: "Centro" },
      onZipCodeLookup,
    })

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith({
        ...values,
        street: "Rua que o lojista digitou",
        neighborhood: "Centro",
        city: "Sangão",
        state: "SC",
      }),
    )
  })

  // The postcode is the one field the lookup does not touch: it is what was typed, mask and all,
  // and the payload mapper strips it at submit.
  it("leaves the postcode exactly as it was typed", async () => {
    const onZipCodeLookup = vi.fn(async () => ({
      zipCode: "01001000",
      street: "Praça da Sé",
      neighborhood: "Sé",
      city: "São Paulo",
      state: "SP",
    }))
    const { onChange } = renderFields({ value: { ...values, zipCode: "01001-000" }, onZipCodeLookup })

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ zipCode: "01001-000" })),
    )
  })

  it("changes nothing when there is no address to fill in", async () => {
    const onZipCodeLookup = vi.fn(async () => null)
    const { onChange } = renderFields({ onZipCodeLookup })

    await userEvent.click(screen.getByRole("button", { name: "Buscar CEP" }))

    await waitFor(() => expect(onZipCodeLookup).toHaveBeenCalled())
    expect(onChange).not.toHaveBeenCalled()
  })

  it("offers no lookup when the screen wired none", () => {
    renderFields()

    expect(screen.queryByRole("button", { name: "Buscar CEP" })).not.toBeInTheDocument()
  })

  it("says the lookup is running and refuses a second click", () => {
    renderFields({ onZipCodeLookup: vi.fn(async () => null), lookupPending: true })

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
        onZipCodeLookup={vi.fn(async () => null)}
        errors={{ zipCode: { message: "Informe um CEP com 8 dígitos" } }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
