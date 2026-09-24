// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ColumnsField } from "./columns-field"

describe("ColumnsField", () => {
  it("names zero as the grid's own choice, and a count as itself", () => {
    const { rerender } = render(<ColumnsField value={0} onChange={vi.fn()} />)
    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("Automático")

    rerender(<ColumnsField value={5} onChange={vi.fn()} />)
    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("5")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ColumnsField value={3} onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
