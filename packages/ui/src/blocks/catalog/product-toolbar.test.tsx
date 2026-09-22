// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { EMPTY_PRODUCT_FILTERS, ProductToolbar, type ProductFilters } from "./product-toolbar"

const categories = [
  { id: "c1", name: "Proteínas" },
  { id: "c2", name: "Whey", parentName: "Proteínas" },
]

function renderToolbar(
  value: ProductFilters = EMPTY_PRODUCT_FILTERS,
  overrides: Partial<Parameters<typeof ProductToolbar>[0]> = {},
) {
  const onChange = vi.fn()

  return {
    onChange,
    ...render(
      <ProductToolbar value={value} onChange={onChange} categories={categories} {...overrides} />,
    ),
  }
}

describe("ProductToolbar", () => {
  it("says what the search box matches, because SKU is not guessable from a magnifier", () => {
    renderToolbar()

    expect(screen.getByPlaceholderText("Nome, SKU ou código de barras")).toBeInTheDocument()
  })

  it("reports every keystroke, and leaves the settling to the screen", async () => {
    const user = userEvent.setup()
    const { onChange } = renderToolbar()

    await user.type(screen.getByLabelText("Buscar produtos"), "wh")

    expect(onChange).toHaveBeenCalledTimes(2)
    expect(onChange).toHaveBeenLastCalledWith({ ...EMPTY_PRODUCT_FILTERS, search: "h" })
  })

  /**
   * A row of controls where one is always dead reads as broken, so the way out only appears once
   * there is something to get out of.
   */
  it("offers no way to clear filters that are not set", () => {
    renderToolbar()

    expect(screen.queryByRole("button", { name: "Limpar filtros" })).not.toBeInTheDocument()
  })

  it("clears every filter at once, the search box included", async () => {
    const user = userEvent.setup()
    const { onChange } = renderToolbar({ ...EMPTY_PRODUCT_FILTERS, status: "DRAFT", search: "whey" })

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }))

    expect(onChange).toHaveBeenCalledWith(EMPTY_PRODUCT_FILTERS)
  })

  /** Base UI shows the raw value unless told how to read it; this is what catches that regression. */
  it("names each filter rather than showing the code it sends", () => {
    renderToolbar({ ...EMPTY_PRODUCT_FILTERS, status: "DRAFT", stock: "UNTRACKED" })

    expect(screen.getByLabelText("Status")).toHaveTextContent("Rascunho")
    expect(screen.getByLabelText("Estoque")).toHaveTextContent("Não controlado")
  })

  it("shows a subcategory under its parent, so two called the same are told apart", () => {
    renderToolbar({ ...EMPTY_PRODUCT_FILTERS, categoryId: "c2" })

    expect(screen.getByLabelText("Categoria")).toHaveTextContent("Whey")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderToolbar()

    await expectNoA11yViolations(container)
  })
})
