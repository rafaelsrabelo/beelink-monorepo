// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSearchSuggestions, type StorefrontSearchSuggestionsProps, type StorefrontSuggestion } from "./storefront-search-suggestions"

const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Whey Concentrado", href: "/loja/produtos/whey", price: "R$ 139,90", wasPrice: "R$ 159,90", hasOptions: false, onAdd: () => {} },
  { id: "2", label: "Whey Isolado", href: "/loja/produtos/iso", imageUrl: "https://example.test/iso.jpg", price: null, hasOptions: true, onAdd: () => {} },
]

function renderList(overrides: Partial<StorefrontSearchSuggestionsProps> = {}) {
  return render(
    <StorefrontSearchSuggestions listId="lista" cellId={(row, column) => `lista-${row}-${column}`} suggestions={suggestions} activeRow={-1} activeColumn={0} {...overrides} />,
  )
}

describe("StorefrontSearchSuggestions", () => {
  it("is a named grid, a row per product, each cell under the id the field points at", () => {
    renderList()

    expect(screen.getByRole("grid", { name: "Sugestões da busca" })).toHaveAttribute("id", "lista")
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(screen.getAllByRole("gridcell").map((cell) => cell.id)).toEqual(["lista-0-0", "lista-0-1", "lista-1-0"])
    expect(screen.getByRole("gridcell", { name: /Whey Concentrado.*R\$ 139,90.*R\$ 159,90/ })).toBeInTheDocument()
  })

  it("marks the cell the arrow keys are on, and no other", () => {
    renderList({ activeRow: 0, activeColumn: 1 })

    expect(screen.getAllByRole("gridcell").map((cell) => cell.getAttribute("aria-selected"))).toEqual(["false", "true", "false"])
  })

  /** A product with options is chosen on its page: its row has no "+" to press. */
  it("offers a "+" only beside a product the cart can take as it is, and it adds without taking the focus", async () => {
    const onAdd = vi.fn()
    renderList({ suggestions: [{ ...suggestions[0]!, onAdd }, suggestions[1]!] })

    const add = screen.getByRole("button", { name: "Adicionar Whey Concentrado ao carrinho" })
    expect(add).toHaveAttribute("tabindex", "-1")
    expect(screen.queryByRole("button", { name: /Whey Isolado/ })).not.toBeInTheDocument()
    expect(fireEvent.mouseDown(add)).toBe(false)
    await userEvent.click(add)
    expect(onAdd).toHaveBeenCalledOnce()
  })

  /** A list that only shows the first few has to say where the rest are. */
  it("offers the whole result when it is showing part of it", () => {
    renderList({ total: 18, seeAllHref: "/loja/busca?q=whey" })

    expect(screen.getByRole("link", { name: "Ver todos os 18 resultados" })).toHaveAttribute("href", "/loja/busca?q=whey")
  })

  it("offers nothing more when it shows all there is", () => {
    renderList({ total: 2, seeAllHref: "/loja/busca?q=whey" })

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  // The field closes the list when it loses the focus: a press that took it would close the link under the pointer.
  it("keeps the focus where it was on a press of the way to every result", () => {
    renderList({ total: 18, seeAllHref: "/loja/busca?q=whey" })

    expect(fireEvent.mouseDown(screen.getByRole("link"))).toBe(false)
  })

  it("says it is looking while there is nothing to list yet", () => {
    renderList({ suggestions: [], pending: true })

    expect(screen.getByText("Buscando…")).toBeInTheDocument()
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderList({ messages: en, total: 18, seeAllHref: "/shop/search?q=whey" })

    expect(screen.getByRole("grid", { name: en.storefront.searchSuggestionsLabel })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList({ activeRow: 0, activeColumn: 1, total: 18, seeAllHref: "/loja/busca?q=whey" })

    await expectNoA11yViolations(container)
  })
})
