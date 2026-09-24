// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ShowcaseFields, showcaseReady, type ShowcaseValue } from "./showcase-fields"

const categories = [
  { id: "c1", name: "Blusas" },
  { id: "c2", name: "Calças" },
]

const products = [{ id: "p1", name: "Blusa azul" }]

const base: ShowcaseValue = { source: "ALL", sourceCategoryId: "", picks: [], display: "RAIL", columns: 0, limit: "" }

function renderFields(value: Partial<ShowcaseValue> = {}) {
  const onChange = vi.fn()
  const { container } = render(
    <ShowcaseFields
      value={{ ...base, ...value }}
      onChange={onChange}
      categories={categories}
      products={products}
      newItemId={() => "novo"}
    />,
  )
  return { onChange, container }
}

describe("ShowcaseFields", () => {
  it("asks a category showcase which category, with a search", async () => {
    const user = userEvent.setup()
    const { onChange } = renderFields({ source: "CATEGORY" })

    expect(screen.getByText("Escolha a categoria da vitrine.")).toBeInTheDocument()
    await user.type(screen.getByLabelText("Categoria"), "cal")
    await user.click(screen.getByRole("button", { name: "Calças" }))

    expect(onChange).toHaveBeenCalledWith({ sourceCategoryId: "c2" })
  })

  it("asks a hand-picked showcase for its products, and nothing about a category", () => {
    renderFields({ source: "SELECTION" })

    expect(screen.getByText("Produtos da vitrine")).toBeInTheDocument()
    expect(screen.queryByLabelText("Categoria")).not.toBeInTheDocument()
  })

  it("offers a rail or a grid, and the columns only for a grid", () => {
    renderFields({ display: "GRID" })

    expect(screen.queryByRole("button", { name: /Carrossel/ })).not.toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Colunas" })).toBeInTheDocument()
  })

  it("asks a rail for no columns", () => {
    renderFields({ display: "RAIL" })

    expect(screen.queryByRole("combobox", { name: "Colunas" })).not.toBeInTheDocument()
  })

  it("marks a limit the API would refuse", () => {
    renderFields({ limit: "60" })

    expect(screen.getByLabelText("Quantos produtos, no máximo")).toHaveAttribute("aria-invalid", "true")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderFields({ source: "CATEGORY", sourceCategoryId: "c1", display: "GRID" })

    await expectNoA11yViolations(container)
  })
})

describe("showcaseReady — a save the API would take", () => {
  it("needs the category a category showcase draws", () => {
    expect(showcaseReady({ ...base, source: "CATEGORY" })).toBe(false)
    expect(showcaseReady({ ...base, source: "CATEGORY", sourceCategoryId: "c1" })).toBe(true)
  })

  it("needs at least one product in a hand-picked showcase", () => {
    expect(showcaseReady({ ...base, source: "SELECTION" })).toBe(false)
    expect(showcaseReady({ ...base, source: "SELECTION", picks: [{ id: "a", productId: "p1" }] })).toBe(true)
  })

  it("takes a blank limit or one from one to forty-eight, and nothing else", () => {
    for (const limit of ["", "1", "48", " 12 "]) expect(showcaseReady({ ...base, limit }), limit).toBe(true)
    for (const limit of ["0", "49", "1.5", "dez"]) expect(showcaseReady({ ...base, limit }), limit).toBe(false)
  })
})
