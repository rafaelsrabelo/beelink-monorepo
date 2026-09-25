// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Lib
import { combinationsOf } from "../../lib/variations"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BASE_ROW, BLOUSE } from "./variation-fixtures"
import { VariationTableHeader } from "./variation-table-header"

const combinations = combinationsOf(BLOUSE, BASE_ROW)

describe("VariationTableHeader", () => {
  it("chooses every combination of one value at once, and lets them go when pressed again", async () => {
    const user = userEvent.setup()
    const onSelection = vi.fn()
    const { rerender } = render(
      <VariationTableHeader combinations={combinations} selection={{}} onSelection={onSelection} onBulk={() => {}} trackStock />,
    )

    await user.click(screen.getByRole("button", { name: "Selecionar todas as combinações de GG" }))
    const chosen = onSelection.mock.calls[0]![0]
    expect(Object.keys(chosen).sort()).toEqual(["GG|areia", "GG|preto", "GG|terracota"])

    rerender(<VariationTableHeader combinations={combinations} selection={chosen} onSelection={onSelection} onBulk={() => {}} trackStock />)
    await user.click(screen.getByRole("button", { name: "Selecionar todas as combinações de GG" }))
    expect(onSelection.mock.calls[1]![0]).toEqual({})
  })

  it("offers the values option by option", () => {
    render(<VariationTableHeader combinations={combinations} selection={{}} onSelection={() => {}} onBulk={() => {}} trackStock />)

    const values = screen.getAllByRole("button", { name: /^Selecionar todas as combinações de/ }).map((button) => button.textContent)
    expect(values).toEqual(["P", "M", "G", "GG", "Areia", "Terracota", "Preto"])
  })

  it("adds a value's combinations to what is already chosen", async () => {
    const user = userEvent.setup()
    const onSelection = vi.fn()
    render(<VariationTableHeader combinations={combinations} selection={{ "P|areia": true }} onSelection={onSelection} onBulk={() => {}} trackStock />)

    await user.click(screen.getByRole("button", { name: "Selecionar todas as combinações de Preto" }))

    expect(Object.keys(onSelection.mock.calls[0]![0])).toHaveLength(5)
  })

  it("counts what is chosen and opens the bulk actions only then, and has no accessibility violations", async () => {
    const user = userEvent.setup()
    const onBulk = vi.fn()
    const { container } = render(
      <VariationTableHeader combinations={combinations} selection={{ "P|areia": true }} onSelection={() => {}} onBulk={onBulk} trackStock />,
    )

    expect(screen.getByText(/1 selecionadas/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Mesmo preço para todas" }))
    expect(onBulk).toHaveBeenCalledWith("price")
    await expectNoA11yViolations(container)
  })
})
