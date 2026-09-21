// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreColorsFields } from "./store-colors-fields"
import { sampleColorPresets, sampleStoreColors } from "./store.fixtures"

function renderFields(overrides: Partial<Parameters<typeof StoreColorsFields>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <StoreColorsFields
      value={sampleStoreColors}
      onChange={onChange}
      presets={sampleColorPresets}
      {...overrides}
    />,
  )
  return { onChange }
}

describe("StoreColorsFields", () => {
  it("applies a ready-made palette whole, since it is four decisions at once", async () => {
    const { onChange } = renderFields()

    await userEvent.click(screen.getByRole("button", { name: /Verde natureza/ }))

    expect(onChange).toHaveBeenCalledWith(sampleColorPresets[1].colors)
  })

  it("offers every palette the screen handed it, and invents none of its own", () => {
    renderFields()

    for (const preset of sampleColorPresets) {
      expect(screen.getByRole("button", { name: new RegExp(preset.name) })).toBeInTheDocument()
    }
  })

  it("paints a palette's swatches from the data, never from a colour of its own", () => {
    renderFields()

    const swatch = screen
      .getByRole("button", { name: /Verde natureza/ })
      .querySelector<HTMLElement>("[style*='--store-swatch']")

    expect(swatch?.style.getPropertyValue("--store-swatch")).toBe(
      sampleColorPresets[1].colors.header,
    )
  })

  it("passes one colour's change up without touching the other three", async () => {
    const { onChange } = renderFields()

    await userEvent.type(screen.getByLabelText("Cor principal"), "0")

    expect(onChange).toHaveBeenCalledWith({
      ...sampleStoreColors,
      primary: `${sampleStoreColors.primary}0`,
    })
  })

  it("drops the palette row rather than the pickers when no theme is wired up", () => {
    renderFields({ presets: [] })

    expect(screen.queryByText("Temas prontos")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Cor principal")).toBeInTheDocument()
  })

  it("renders the verdict on a colour the schema refused", () => {
    renderFields({
      value: { ...sampleStoreColors, primary: "azul" },
      errors: { primary: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } },
    })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe uma cor no formato hexadecimal de 6 dígitos",
    )
  })

  it("takes no edit while the save is in flight, palettes included", () => {
    renderFields({ disabled: true })

    expect(screen.getByRole("button", { name: /Verde natureza/ })).toBeDisabled()
    expect(screen.getByLabelText("Cor principal")).toBeDisabled()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderFields({ messages: en })

    expect(screen.getByLabelText("Primary colour")).toBeInTheDocument()
    expect(screen.queryByLabelText("Cor principal")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreColorsFields
        value={{ ...sampleStoreColors, primary: "azul" }}
        onChange={vi.fn()}
        presets={sampleColorPresets}
        errors={{ primary: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
