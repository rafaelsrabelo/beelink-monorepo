// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ComponentLayoutFields, hasLayout, type ComponentLayoutValues } from "./component-layout-fields"
import type { ComponentKind } from "./design-types"

const base: ComponentLayoutValues = { span: "HALF", display: null, columns: 0, align: "LEFT", visibleOn: "ALL" }

function renderFields(kind: ComponentKind, over: Partial<ComponentLayoutValues> = {}) {
  const onChange = vi.fn()
  const view = render(<ComponentLayoutFields kind={kind} value={{ ...base, ...over }} onChange={onChange} bandWidth="FULL" />)
  return { ...view, onChange }
}

describe("ComponentLayoutFields", () => {
  it("says a change here shows at once and waits for Publicar", () => {
    renderFields("HEADING")

    expect(screen.getByText("Muda na prévia agora; vai para a loja quando você publicar.")).toBeInTheDocument()
  })

  // The block's slice, and the band's width beside it in words of its own.
  it("offers every block its slice of the band, and says the band's width beside it", async () => {
    const user = userEvent.setup()
    const { onChange } = renderFields("BENEFITS")

    const largura = screen.getByRole("group", { name: "Largura do bloco" })
    expect(within(largura).getByRole("button", { name: "Metade", pressed: true })).toBeInTheDocument()
    expect(screen.getByText(/Largura da faixa: Ponta a ponta/)).toBeInTheDocument()

    await user.click(within(largura).getByRole("button", { name: "Um terço" }))
    expect(onChange).toHaveBeenCalledWith({ span: "THIRD" })
  })

  // The layout is a picker of drawings: the four a banner draws, the one in use pressed.
  it("offers a banner its four layouts, and no columns or alignment", async () => {
    const user = userEvent.setup()
    const { onChange } = renderFields("BANNER", { display: "GRID" })

    await user.click(screen.getByRole("button", { name: "Formato: Grade" }))
    const picker = await screen.findByRole("group", { name: "Formato" })
    expect(within(picker).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Imagem ao fundo",
      "Dividida",
      "Carrossel",
      "Grade",
    ])
    expect(within(picker).getByRole("button", { name: "Grade", pressed: true })).toBeInTheDocument()
    await user.click(within(picker).getByRole("button", { name: "Dividida" }))
    expect(onChange).toHaveBeenCalledWith({ display: "SPLIT" })
    expect(screen.queryByRole("combobox", { name: "Colunas" })).not.toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Alinhamento" })).not.toBeInTheDocument()
  })

  it("offers a showcase a rail or a grid, and the grid its columns", async () => {
    const user = userEvent.setup()
    const { onChange, unmount } = renderFields("PRODUCTS", { display: "RAIL" })

    expect(screen.queryByRole("combobox", { name: "Colunas" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Formato: Trilho" }))
    await user.click(within(await screen.findByRole("group", { name: "Formato" })).getByRole("button", { name: "Grade" }))
    expect(onChange).toHaveBeenCalledWith({ display: "GRID" })
    unmount()

    renderFields("PRODUCTS", { display: "GRID", columns: 4 })
    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("4")
  })

  it("says what the categories' rail and grid each do", () => {
    const { rerender } = renderFields("CATEGORIES", { display: "RAIL" })
    expect(screen.getByText(/Uma linha só/)).toBeInTheDocument()

    rerender(<ComponentLayoutFields kind="CATEGORIES" value={{ ...base, display: "GRID" }} onChange={vi.fn()} bandWidth="FULL" />)
    expect(screen.getByText("Todas as categorias à vista, em linhas.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Colunas" })).toHaveTextContent("Automático")
  })

  it("offers alignment to a heading and a paragraph", async () => {
    const user = userEvent.setup()
    const { onChange } = renderFields("TEXT", { align: "RIGHT" })

    expect(screen.getByRole("button", { name: "Direita", pressed: true })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Centro" }))
    expect(onChange).toHaveBeenCalledWith({ align: "CENTER" })
  })

  // The strip is drawn above the header, outside the band's grid.
  // No slice and no screen to choose — it is above the header, everywhere — but still or scrolling.
  it("asks the strip only whether it scrolls", () => {
    expect(hasLayout("ANNOUNCEMENT")).toBe(true)
    renderFields("ANNOUNCEMENT", { display: "STATIC" })

    expect(screen.getByRole("button", { name: "Formato: Fixa" })).toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Largura do bloco" })).not.toBeInTheDocument()
    expect(screen.queryByRole("group", { name: "Aparece em" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderFields("PRODUCTS", { display: "GRID" })

    await expectNoA11yViolations(container)
  })
})

describe("ComponentLayoutFields — Aparece em", () => {
  // Every kind with a layout says where it shows; it waits for Publicar with the rest of the tab.
  it("asks where the block shows, and hands the answer on with the layout", async () => {
    const onChange = vi.fn()
    render(<ComponentLayoutFields kind="BANNER" value={{ ...base, display: "CAROUSEL" }} onChange={onChange} bandWidth="FULL" />)

    await userEvent.click(screen.getByRole("button", { name: "Celular" }))

    expect(onChange).toHaveBeenCalledWith({ visibleOn: "DESKTOP" })
  })
})
