// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSearchCombobox, type StorefrontSuggestion } from "./storefront-search-combobox"

const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Whey Concentrado", href: "/loja/produtos/whey", price: "R$ 139,90" },
  { id: "2", label: "Whey Isolado", href: "/loja/produtos/iso", price: "R$ 189,90" },
]

function renderBox(overrides: Partial<Parameters<typeof StorefrontSearchCombobox>[0]> = {}) {
  return render(
    <StorefrontSearchCombobox
      action="/loja/busca"
      value="whey"
      onValueChange={() => {}}
      suggestions={suggestions}
      {...overrides}
    />,
  )
}

describe("StorefrontSearchCombobox", () => {
  /**
   * The list is a shortcut on top of a working form. With no JavaScript — or before it arrives, or
   * when the suggestion request fails — Enter still goes to the search page, which is the address
   * a person can bookmark and a crawler can follow.
   */
  it("is a GET form around a named field, whatever the list is doing", () => {
    const { container } = renderBox({ suggestions: [] })

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/loja/busca")
    expect(container.querySelector('input[name="q"]')).toBeInTheDocument()
  })

  it("announces itself as a combobox that has a list open", () => {
    renderBox()

    const field = screen.getByRole("combobox")
    expect(field).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("listbox")).toHaveAccessibleName("Sugestões da busca")
    expect(screen.getAllByRole("option")).toHaveLength(2)
  })

  /**
   * Focus never leaves the field: the arrows move `aria-activedescendant` while the caret stays
   * put. A list that steals focus is a list you cannot keep typing into.
   */
  it("walks the list with the arrows without moving the caret out of the field", async () => {
    const user = userEvent.setup()
    renderBox()

    const field = screen.getByRole("combobox")
    await user.click(field)
    await user.keyboard("{ArrowDown}")

    expect(field).toHaveFocus()
    expect(field.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[0].id)
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
  })

  it("closes the list on Escape and leaves the field alone", async () => {
    const user = userEvent.setup()
    renderBox()

    await user.click(screen.getByRole("combobox"))
    await user.keyboard("{Escape}")

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false")
  })

  it("reports what was typed, so the screen owns the term", async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    renderBox({ value: "", onValueChange, suggestions: [] })

    await user.type(screen.getByRole("combobox"), "c")

    expect(onValueChange).toHaveBeenCalledWith("c")
  })

  /** A list that only shows the first few has to say where the rest are. */
  it("offers the whole result when it is showing part of it", () => {
    renderBox({ total: 18, seeAllHref: "/loja/busca?q=whey" })

    expect(screen.getByRole("link", { name: "Ver todos os 18 resultados" })).toHaveAttribute(
      "href",
      "/loja/busca?q=whey",
    )
  })

  /**
   * An option containing an anchor is an interactive control inside one — axe fails it, and a
   * screen reader reads two things where the visitor sees one. The axe test below would catch it,
   * but only as a rule id; this says what the rule is protecting.
   */
  it("keeps the options free of controls of their own", () => {
    renderBox()

    for (const option of screen.getAllByRole("option")) {
      expect(option.querySelector("a, button, input")).toBeNull()
    }
  })

  it("reports the scope picked, so the suggestions can follow it", async () => {
    const user = userEvent.setup()
    const onScopeChange = vi.fn()
    render(
      <StorefrontSearchCombobox
        action="/loja/busca"
        value=""
        onValueChange={() => {}}
        suggestions={[]}
        scopes={[{ value: "whey", label: "Whey" }]}
        scope=""
        onScopeChange={onScopeChange}
      />,
    )

    await user.selectOptions(screen.getByRole("combobox", { name: "Buscar em" }), "whey")
    expect(onScopeChange).toHaveBeenCalledWith("whey")
  })

  it("draws no list at all when there is nothing to suggest", () => {
    renderBox({ suggestions: [] })

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderBox({ total: 18, seeAllHref: "/loja/busca?q=whey" })

    await expectNoA11yViolations(container)
  })
})
