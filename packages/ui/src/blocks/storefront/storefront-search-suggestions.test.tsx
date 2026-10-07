// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSearchSuggestions, type StorefrontSearchSuggestionsProps, type StorefrontSuggestion } from "./storefront-search-suggestions"

const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Whey Concentrado", href: "/loja/produtos/whey", price: "R$ 139,90" },
  { id: "2", label: "Whey Isolado", href: "/loja/produtos/iso", imageUrl: "https://example.test/iso.jpg", price: null },
]

function renderList(overrides: Partial<StorefrontSearchSuggestionsProps> = {}) {
  return render(<StorefrontSearchSuggestions listId="lista" optionId={(index) => `lista-${index}`} suggestions={suggestions} active={-1} {...overrides} />)
}

describe("StorefrontSearchSuggestions", () => {
  it("is a named listbox of options, each under the id the field points at", () => {
    renderList()

    expect(screen.getByRole("listbox", { name: "Sugestões da busca" })).toHaveAttribute("id", "lista")
    expect(screen.getAllByRole("option").map((option) => option.id)).toEqual(["lista-0", "lista-1"])
    expect(screen.getByRole("option", { name: /Whey Concentrado.*R\$ 139,90/ })).toBeInTheDocument()
  })

  it("marks the row the arrow keys are on, and no other", () => {
    renderList({ active: 1 })

    expect(screen.getAllByRole("option").map((option) => option.getAttribute("aria-selected"))).toEqual(["false", "true"])
  })

  /**
   * An option containing an anchor is an interactive control inside one — axe fails it, and a
   * screen reader reads two things where the visitor sees one.
   */
  it("keeps the options free of controls of their own", () => {
    renderList()

    for (const option of screen.getAllByRole("option")) expect(option.querySelector("a, button, input")).toBeNull()
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

    expect(screen.getByRole("listbox", { name: en.storefront.searchSuggestionsLabel })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderList({ active: 0, total: 18, seeAllHref: "/loja/busca?q=whey" })

    await expectNoA11yViolations(container)
  })
})
