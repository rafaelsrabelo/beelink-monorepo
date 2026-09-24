// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Lib
import { combinationsOf } from "../../lib/variations"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BASE_ROW, BLOUSE } from "./variation-fixtures"
import { VariationTable } from "./variation-table"

const combinations = combinationsOf(BLOUSE, BASE_ROW)

describe("VariationTable", () => {
  it("draws a row per combination, the switched-off one struck through with its fields closed", () => {
    render(<VariationTable combinations={combinations} onRow={() => {}} trackStock selection={{}} onSelection={() => {}} />)

    expect(screen.getAllByRole("row")).toHaveLength(13)
    expect(screen.getByText("GG · Terracota")).toHaveClass("line-through")
    expect(screen.getByRole("textbox", { name: "Preço de GG · Terracota" })).toBeDisabled()
    expect(screen.getByRole("switch", { name: "Vendo GG · Terracota" })).not.toBeChecked()
  })

  it("selects every row at once, keyed by combination", async () => {
    const user = userEvent.setup()
    const onSelection = vi.fn()
    render(<VariationTable combinations={combinations} onRow={() => {}} trackStock selection={{}} onSelection={onSelection} />)

    await user.click(screen.getByRole("checkbox", { name: "Selecionar todas" }))

    expect(Object.keys(onSelection.mock.calls[0]![0])).toHaveLength(12)
    expect(onSelection.mock.calls[0]![0]["P|areia"]).toBe(true)
  })

  it("reports an edit with the combination it belongs to", async () => {
    const user = userEvent.setup()
    const onRow = vi.fn()
    render(<VariationTable combinations={combinations} onRow={onRow} trackStock selection={{}} onSelection={() => {}} />)

    await user.type(screen.getByRole("textbox", { name: "Código de M · Preto" }), "X")

    expect(onRow).toHaveBeenCalledWith(expect.objectContaining({ key: "M|preto" }), { sku: "X" })
  })

  it("shows a row's problem beside its name, and has no accessibility violations", async () => {
    const { container } = render(
      <VariationTable
        combinations={combinations}
        onRow={() => {}}
        trackStock={false}
        selection={{}}
        onSelection={() => {}}
        errors={{ "P|areia": "Informe o preço de P · Areia." }}
      />,
    )

    expect(screen.getByRole("alert")).toHaveTextContent("Informe o preço de P · Areia.")
    expect(screen.getByRole("textbox", { name: "Estoque de P · Areia" })).toHaveAttribute("placeholder", "Não contado")
    await expectNoA11yViolations(container)
  })
})
