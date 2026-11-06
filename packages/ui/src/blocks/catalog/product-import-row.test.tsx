// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { importCategories, importRows } from "./product-import-fixtures"
import { ProductImportRow } from "./product-import-row"

function renderRow(row = importRows[0]!, onChange = vi.fn()) {
  return render(
    <ul>
      <ProductImportRow row={row} categories={importCategories} onChange={onChange} />
    </ul>,
  )
}

describe("ProductImportRow", () => {
  it("names every field after its product, and lists the flavours with the one priced apart", async () => {
    const { container } = renderRow()

    expect(screen.getByRole("checkbox", { name: "Importar Dindin gourmet" })).toBeChecked()
    expect(screen.getByRole("textbox", { name: "Nome de Dindin gourmet" })).toHaveValue("Dindin gourmet")
    expect(screen.getByRole("textbox", { name: "Preço de Dindin gourmet" })).toHaveValue("4,00")
    expect(screen.getByText("Sabor: Coco, Nutella R$ 6,50")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Categoria de Dindin gourmet" })).toHaveTextContent("Nova: Dindins")
    await expectNoA11yViolations(container)
  })

  it("asks for the price a ticked row is missing, and stops asking once it is unticked", () => {
    const { rerender } = renderRow(importRows[2]!)

    expect(screen.getByRole("textbox", { name: "Preço de Suco de cajá" })).toHaveAccessibleDescription(
      "O documento não mostra o preço. Digite o preço.",
    )

    rerender(
      <ul>
        <ProductImportRow row={{ ...importRows[2]!, include: false }} categories={importCategories} onChange={vi.fn()} />
      </ul>,
    )
    expect(screen.queryByText("O documento não mostra o preço. Digite o preço.")).not.toBeInTheDocument()
  })

  it("answers the row with what was typed or unticked", async () => {
    const onChange = vi.fn()
    renderRow(importRows[1]!, onChange)

    await userEvent.type(screen.getByRole("textbox", { name: "Preço de Picolé de uva" }), "0")
    await userEvent.click(screen.getByRole("checkbox", { name: "Importar Picolé de uva" }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ key: "row-1", price: "5,000" }))
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ key: "row-1", include: false }))
  })
})
