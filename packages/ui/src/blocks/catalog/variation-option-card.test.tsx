// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { VariationOptionCard, type VariationOptionCardProps } from "./variation-option-card"
import { FIRST_SWATCH } from "../../lib/variations"
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
  const submit = vi.fn((event: React.FormEvent) => event.preventDefault())
  return {
    props,
    submit,
    ...render(
      <form onSubmit={submit}>
        <VariationOptionCard {...props} />
        <button type="submit">Salvar</button>
      </form>,
    ),
  }
}

describe("VariationOptionCard", () => {
  it("adds a value on Enter without submitting the form around it, and clears the field", async () => {
    const user = userEvent.setup()
    const { props, submit } = renderCard()

    const field = screen.getByRole("textbox", { name: "Novo valor de Tamanho" })
    await user.type(field, "XG{Enter}")

    expect(props.onAddValue).toHaveBeenCalledWith("XG", null)
    expect(field).toHaveValue("")
    expect(submit).not.toHaveBeenCalled()
  })

  it("moves focus to the next value's remove button when a value goes", async () => {
    const user = userEvent.setup()
    const { props, rerender } = renderCard()

    await user.click(screen.getByRole("button", { name: "Remover M" }))
    rerender(
      <form>
        <VariationOptionCard {...props} option={{ ...BLOUSE.options[0]!, values: BLOUSE.options[0]!.values.filter((value) => value.key !== "M") }} />
      </form>,
    )

    expect(screen.getByRole("button", { name: "Remover G" })).toHaveFocus()
  })

  it("shows each value's swatch on a colour option, and a new value starts on the neutral one", async () => {
    const user = userEvent.setup()
    const { props } = renderCard({ option: BLOUSE.options[1]! })

    await user.type(screen.getByRole("textbox", { name: "Novo valor de Cor" }), "Verde{Enter}")

    expect(props.onAddValue).toHaveBeenCalledWith("Verde", FIRST_SWATCH)
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
