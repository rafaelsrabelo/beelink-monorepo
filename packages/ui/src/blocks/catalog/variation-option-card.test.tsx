// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { VariationOptionCard, type VariationOptionCardProps } from "./variation-option-card"
import { BLOUSE, swatch } from "./variation-fixtures"

function renderCard(overrides: Partial<VariationOptionCardProps> = {}) {
  const props: VariationOptionCardProps = {
    option: BLOUSE.options[0]!,
    number: 1,
    onRename: vi.fn(),
    onAddValue: vi.fn(),
    onRemoveValue: vi.fn(),
    onReorderValues: vi.fn(),
    onColor: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  }
  return { props, ...render(<VariationOptionCard {...props} />) }
}

describe("VariationOptionCard", () => {
  it("adds a value on Enter without submitting the form around it, and clears the field", async () => {
    const user = userEvent.setup()
    const submit = vi.fn((event: SubmitEvent) => event.preventDefault())
    document.addEventListener("submit", submit)
    const { props } = renderCard()

    const field = screen.getByRole("textbox", { name: "Novo valor de Tamanho" })
    await user.type(field, "XG{Enter}")

    expect(props.onAddValue).toHaveBeenCalledWith("XG", null)
    expect(field).toHaveValue("")
    expect(submit).not.toHaveBeenCalled()
    document.removeEventListener("submit", submit)
  })

  it("shows each value's swatch on a colour option, and a new value starts without one", async () => {
    const user = userEvent.setup()
    const { props } = renderCard({ option: BLOUSE.options[1]! })

    await user.type(screen.getByRole("textbox", { name: "Novo valor de Cor" }), "Verde{Enter}")

    expect(props.onAddValue).toHaveBeenCalledWith("Verde", null)
    expect(screen.getByLabelText("Cor de Areia")).toHaveValue(swatch("d9c7a7"))
  })

  it("removes a value and the whole option by their named buttons", async () => {
    const user = userEvent.setup()
    const { props } = renderCard()

    await user.click(screen.getByRole("button", { name: "Remover M" }))
    await user.click(screen.getByRole("button", { name: "Remover opção Tamanho" }))

    expect(props.onRemoveValue).toHaveBeenCalledWith("M")
    expect(props.onRemove).toHaveBeenCalled()
  })

  it("names every value's drag handle, and has no accessibility violations", async () => {
    const { container } = renderCard()

    expect(screen.getByRole("button", { name: "Arrastar GG" })).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
