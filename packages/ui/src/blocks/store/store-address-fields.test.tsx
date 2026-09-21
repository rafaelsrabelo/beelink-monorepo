// Libs
import { render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
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
  /**
   * The box is driven by what is in the field, so a test that holds the value still is testing a
   * field nobody uses. This is how the form drives it: state in, state out.
   */
  function ControlledFields({
    initial,
    ...props
  }: { initial: typeof values } & Partial<Parameters<typeof StoreAddressFields>[0]>) {
    const [value, setValue] = useState(initial)
    return (
      <StoreAddressFields
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next)
          props.onChange?.(next)
        }}
      />
    )
  }

  describe("the address box", () => {
    const suggestion = {
      id: "address.1",
      label: "Rua Lavras, 120, Aldeota, Fortaleza, CE",
      street: "Rua Lavras da Mangabeira",
      number: "143",
      neighborhood: "Aldeota",
      city: "Fortaleza",
      state: "CE",
      zipCode: "60170070",
      latitude: -3.7436,
      longitude: -38.4998,
    }

    function renderBox(overrides: Partial<Parameters<typeof StoreAddressFields>[0]> = {}, initial = values) {
      const onChange = vi.fn()
      const onAddressSearch = vi.fn()
      render(
        <ControlledFields
          initial={initial}
          onChange={onChange}
          onAddressSearch={onAddressSearch}
          suggestions={[suggestion]}
          {...overrides}
        />,
      )
      return { onChange, onAddressSearch }
    }

    it("reports what is typed, so the screen can search — it never searches itself", async () => {
      const { onAddressSearch } = renderBox({}, { ...values, street: "" })

      await userEvent.type(screen.getByLabelText("Rua"), "Rua Lav")

      expect(onAddressSearch).toHaveBeenLastCalledWith("Rua Lav")
    })

    it("fills the whole address from one pick, not just the street", async () => {
      const { onChange } = renderBox({}, { ...values, street: "", neighborhood: "", city: "", state: "", zipCode: "" })

      await userEvent.type(screen.getByLabelText("Rua"), "Rua Lav")
      await userEvent.click(await screen.findByText(suggestion.label))

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          street: "Rua Lavras da Mangabeira",
      number: "143",
          neighborhood: "Aldeota",
          city: "Fortaleza",
          state: "CE",
          zipCode: "60170070",
        }),
      )
    })

    /**
     * The number belongs in the number field, not glued to the street. Gluing it left the street
     * reading "Rua Lavras da Mangabeira, 143" with the number box empty beside it, and no way to
     * correct the number without editing the street around it.
     */
    it("puts the house number in the number field, and leaves the street alone", async () => {
      const { onChange } = renderBox({}, { ...values, street: "", number: "" })

      await userEvent.type(screen.getByLabelText("Rua"), "Rua Lav")
      await userEvent.click(await screen.findByText(suggestion.label))

      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ street: "Rua Lavras da Mangabeira", number: "143" }),
      )
    })

    /**
     * No provider returns a flat or a block. Writing an empty complement through is the one
     * mistake in this merge that costs a delivery.
     */
    it("never touches the complement", async () => {
      const { onChange } = renderBox({}, { ...values, street: "", complement: "Apto 101" })

      await userEvent.type(screen.getByLabelText("Rua"), "Rua Lav")
      await userEvent.click(await screen.findByText(suggestion.label))

      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ complement: "Apto 101" }))
    })

    it("keeps a number already typed when the suggestion carries none", async () => {
      const { onChange } = renderBox(
        { suggestions: [{ ...suggestion, number: "" }] },
        { ...values, street: "", number: "500" },
      )

      await userEvent.type(screen.getByLabelText("Rua"), "Rua Lav")
      await userEvent.click(await screen.findByText(suggestion.label))

      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ number: "500" }))
    })

    it("keeps a field the suggestion knew nothing about", async () => {
      const { onChange } = renderBox(
        { suggestions: [{ ...suggestion, neighborhood: "" }] },
        { ...values, street: "", neighborhood: "Centro" },
      )

      await userEvent.type(screen.getByLabelText("Rua"), "Rua Lav")
      await userEvent.click(await screen.findByText(suggestion.label))

      expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ neighborhood: "Centro" }))
    })

    it("stays a plain field when no search is wired up", async () => {
      const { onChange } = renderBox({ onAddressSearch: undefined }, { ...values, street: "" })

      await userEvent.type(screen.getByLabelText("Rua"), "R")

      expect(onChange).toHaveBeenLastCalledWith({ ...values, street: "R" })
    })
  })

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
