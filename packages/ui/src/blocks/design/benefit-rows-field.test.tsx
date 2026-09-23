// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BenefitRowsField, type BenefitValue } from "./benefit-rows-field"

const rows: BenefitValue[] = [
  { id: "b1", icon: "truck", title: "Entrega rápida", detail: "Em até 2 dias" },
  { id: "b2", icon: "qr-code", title: "", detail: "" },
]

function renderField(value: BenefitValue[]) {
  const onChange = vi.fn()
  render(<BenefitRowsField value={value} onChange={onChange} newRowId={() => "new"} />)
  return { onChange }
}

describe("BenefitRowsField", () => {
  it("adds a promise with the default icon and the id the screen minted", async () => {
    const user = userEvent.setup()
    const { onChange } = renderField([])

    await user.click(screen.getByRole("button", { name: "Adicionar vantagem" }))

    expect(onChange).toHaveBeenCalledWith([{ id: "new", icon: "check", title: "", detail: "" }])
  })

  it("calls an untitled promise by its place, so the bin says which one it takes", () => {
    renderField(rows)

    expect(screen.getByRole("button", { name: "Excluir bloco: Entrega rápida" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Excluir bloco: Vantagem 2" })).toBeInTheDocument()
  })

  /** A grid of glyphs and not a list of names: an icon is chosen by looking at it. */
  it("marks the chosen icon and hands a new choice back", async () => {
    const user = userEvent.setup()
    const { onChange } = renderField([rows[0]!])

    expect(screen.getByRole("button", { name: "truck" })).toHaveAttribute("aria-pressed", "true")

    await user.click(screen.getByRole("button", { name: "gift" }))

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: "b1", icon: "gift" })])
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<BenefitRowsField value={rows} onChange={vi.fn()} newRowId={() => "new"} />)

    await expectNoA11yViolations(container)
  })
})
