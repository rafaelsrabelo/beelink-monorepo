// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BannerArrangement, PRODUCTS_ROW_ID, type ArrangementItem } from "./banner-arrangement"

const items: ArrangementItem[] = [
  { id: "1", title: "Coleção de inverno", imageUrl: "/a.jpg", layout: "FULL", isActive: true },
  { id: "2", title: "Frete grátis", imageUrl: "/b.jpg", layout: "HALVES", isActive: false },
]

function renderList(overrides: Partial<React.ComponentProps<typeof BannerArrangement>> = {}) {
  const onReorder = vi.fn()
  const onToggle = vi.fn()
  const onLayoutChange = vi.fn()

  const view = render(
    <BannerArrangement
      items={items}
      onReorder={onReorder}
      onToggle={onToggle}
      onLayoutChange={onLayoutChange}
      {...overrides}
    />,
  )

  return { ...view, onReorder, onToggle, onLayoutChange }
}

describe("BannerArrangement", () => {
  it("names every control after the banner it acts on", () => {
    renderList()

    // A panel of four buttons called "Arrastar", "Mostrar", "Arrastar", "Esconder" tells a screen
    // reader which verb but never which poster.
    expect(screen.getByRole("button", { name: "Arrastar: Coleção de inverno" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Esconder da loja: Coleção de inverno" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mostrar na loja: Frete grátis" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toBeInTheDocument()
  })

  it("asks for the opposite of what a banner is now", async () => {
    const user = userEvent.setup()
    const { onToggle } = renderList()

    await user.click(screen.getByRole("button", { name: "Esconder da loja: Coleção de inverno" }))

    expect(onToggle).toHaveBeenCalledWith("1", false)
  })

  it("says the size in words, never the stored value", () => {
    renderList()

    // The select holds "HALVES"; a shopkeeper reads "Metade". Base UI shows the raw value unless
    // the trigger is given a render function, and that regression is invisible in a type-check.
    expect(screen.getByRole("combobox", { name: "Tamanho: Frete grátis" })).toHaveTextContent("Metade")
  })

  it("puts the products in the list, draggable like a poster", () => {
    renderList()

    // Not a divider between two lists: as a row it is dragged itself, so moving every poster
    // under the products is one drag rather than one per poster.
    expect(screen.getByText("Lista de produtos")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Arrastar: Lista de produtos" })).toBeInTheDocument()
  })

  it("gives the products no eye and no size", () => {
    renderList()

    // A shop's landing page without its products is not an arrangement anyone wants, and "how
    // wide" is a question about a poster.
    expect(screen.queryByRole("button", { name: /loja: Lista de produtos/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /Lista de produtos/ })).not.toBeInTheDocument()
  })

  it("draws the two sides in the order the landing page does", () => {
    renderList({ items: [items[0]!], itemsBelow: [items[1]!] })

    const rows = screen.getAllByRole("listitem").map((row) => row.textContent)

    expect(rows[0]).toContain("Coleção de inverno")
    expect(rows[1]).toContain("Lista de produtos")
    expect(rows[2]).toContain("Frete grátis")
  })

  it("keeps the products' own id, which is how a side is read back", () => {
    // The screen splits `onReorder` on this id. A rename here silently sends every poster to one
    // side, and nothing else in either file would fail.
    expect(PRODUCTS_ROW_ID).toBe("__products__")
  })

  it("invites a first banner instead of drawing an empty list", () => {
    renderList({ items: [] })

    expect(screen.getByText("Nenhum banner para arrumar.")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList()

    await expectNoA11yViolations(container)
  })
})
