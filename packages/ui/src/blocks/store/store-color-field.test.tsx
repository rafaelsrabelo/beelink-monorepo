// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StoreColorField } from "./store-color-field"
import { sampleStoreColors } from "./store.fixtures"

function renderField(overrides: Partial<Parameters<typeof StoreColorField>[0]> = {}) {
  const onChange = vi.fn()
  render(
    <StoreColorField
      id="store-color-primary"
      label="Cor principal"
      pickerSuffix="seletor de cor"
      value={sampleStoreColors.primary}
      onChange={onChange}
      {...overrides}
    />,
  )
  return { onChange }
}

describe("StoreColorField", () => {
  it("shows the colour it was given, and decides none of its own", () => {
    renderField()

    expect(screen.getByLabelText("Cor principal")).toHaveValue(sampleStoreColors.primary)
    expect(screen.getByLabelText("Cor principal (seletor de cor)")).toHaveAttribute("type", "color")
  })

  it("reports what was typed instead of keeping it", async () => {
    const { onChange } = renderField()

    await userEvent.type(screen.getByLabelText("Cor principal"), "0")

    expect(onChange).toHaveBeenCalledWith(`${sampleStoreColors.primary}0`)
  })

  it("gives the picker a name of its own, so two controls are not one label", () => {
    renderField()

    expect(screen.getAllByLabelText(/Cor principal/)).toHaveLength(2)
  })

  it("renders the verdict the screen's form handed it", () => {
    renderField({ error: { message: "Informe uma cor no formato hexadecimal de 6 dígitos" } })

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe uma cor no formato hexadecimal de 6 dígitos",
    )
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StoreColorField
        id="store-color-primary"
        label="Cor principal"
        pickerSuffix="seletor de cor"
        value={sampleStoreColors.primary}
        onChange={vi.fn()}
        error={{ message: "Informe uma cor no formato hexadecimal de 6 dígitos" }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
