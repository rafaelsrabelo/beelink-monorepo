// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSearchCombobox, type StorefrontSearchComboboxProps, type StorefrontSuggestion } from "./storefront-search-combobox"

const suggestions: StorefrontSuggestion[] = [
  { id: "1", label: "Whey Concentrado", href: "/loja/produtos/whey", price: "R$ 139,90" },
  { id: "2", label: "Whey Isolado", href: "/loja/produtos/iso", price: "R$ 189,90" },
]

/** Controlled from the outside, exactly as the screen does it: the term is the screen's. */
function Box({ value: initial = "", ...overrides }: Partial<StorefrontSearchComboboxProps>) {
  const [value, setValue] = useState(initial)
  return <StorefrontSearchCombobox action="/loja/busca" value={value} onValueChange={setValue} suggestions={suggestions} {...overrides} />
}

function renderBox(overrides: Partial<StorefrontSearchComboboxProps> = {}) {
  return { user: userEvent.setup(), ...render(<Box {...overrides} />) }
}

/** The field with a term typed into it, which is what opens the list. */
async function typed(overrides: Partial<StorefrontSearchComboboxProps> = {}) {
  const rendered = renderBox(overrides)
  // By its name: with a scope, the "Buscar em" select is a combobox too.
  await rendered.user.type(screen.getByRole("combobox", { name: "Buscar nesta loja" }), "whey")
  return rendered
}

/** Whether the form was sent, read where the browser would act on it. jsdom navigates nowhere. */
function submissionsOf(container: HTMLElement) {
  const sent = vi.fn((event: SubmitEvent) => event.preventDefault())
  container.querySelector("form")!.addEventListener("submit", sent)
  return sent
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

  describe("when the list opens", () => {
    /**
     * The results page hands the term back to this field, and there are suggestions for it: the
     * list used to open over the very results the visitor had asked for, before any key.
     */
    it("stays closed over a term the page handed back, whatever there is to suggest", () => {
      renderBox({ value: "whey" })

      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("opens once someone types, and announces itself as a combobox with a list", async () => {
      await typed()

      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "true")
      expect(screen.getByRole("listbox")).toHaveAccessibleName("Sugestões da busca")
      expect(screen.getAllByRole("option")).toHaveLength(2)
    })

    it("closes on Escape and leaves the field alone", async () => {
      const { user } = await typed()

      await user.keyboard("{Escape}")

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
      expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false")
      expect(screen.getByRole("combobox")).toHaveValue("whey")
    })

    // Nothing but Escape used to close it: it sat over the page for as long as the page lived.
    it("closes when the field is left", async () => {
      const { user } = await typed()

      await user.tab()

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    // Chrome clears a search field on Escape: the list of the term just erased must not open again.
    it("closes when the field is emptied", async () => {
      const { user } = await typed()

      await user.clear(screen.getByRole("combobox"))

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("comes back on the arrow down, on its first row", async () => {
      const { user } = await typed()
      await user.keyboard("{Escape}{ArrowDown}")

      expect(screen.getByRole("combobox").getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[0].id)
    })

    it("draws no list at all when there is nothing to suggest", async () => {
      await typed({ suggestions: [] })

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })
  })

  describe("Enter", () => {
    it("sends the search with the term typed, and closes the list on the way", async () => {
      const { user, container } = await typed()
      const sent = submissionsOf(container)

      await user.keyboard("{Enter}")

      expect(sent).toHaveBeenCalledTimes(1)
      expect(new FormData(container.querySelector("form")!).get("q")).toBe("whey")
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    })

    it("carries the category chosen", async () => {
      const { user, container } = await typed({ scopes: [{ value: "proteinas", label: "Proteínas" }], scope: "proteinas" })
      const sent = submissionsOf(container)

      await user.keyboard("{Enter}")

      expect(sent).toHaveBeenCalledTimes(1)
      expect(new FormData(container.querySelector("form")!).get("categoria")).toBe("proteinas")
    })

    /**
     * The pointer rests where the list opens. With the row under it taken for the keyboard's own,
     * Enter opened that product instead of searching.
     */
    it("still sends the search with the pointer resting on a suggestion", async () => {
      const { user, container } = await typed()
      const sent = submissionsOf(container)

      await user.hover(screen.getAllByRole("option")[0])
      await user.keyboard("{Enter}")

      expect(screen.getByRole("combobox")).not.toHaveAttribute("aria-activedescendant")
      expect(sent).toHaveBeenCalledTimes(1)
    })

    it("means the suggestion the arrows are on, and sends no search then", async () => {
      const { user, container } = await typed()
      const sent = submissionsOf(container)

      await user.keyboard("{ArrowDown}")
      expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
      await user.keyboard("{Enter}")

      expect(sent).not.toHaveBeenCalled()
    })
  })

  /**
   * Focus never leaves the field: the arrows move `aria-activedescendant` while the caret stays
   * put. A list that steals focus is a list you cannot keep typing into.
   */
  it("walks the list with the arrows without moving the caret out of the field", async () => {
    const { user } = await typed()
    const field = screen.getByRole("combobox")

    await user.keyboard("{ArrowDown}")

    expect(field).toHaveFocus()
    expect(field.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[0].id)
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
  })

  it("reports what was typed, so the screen owns the term", async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<StorefrontSearchCombobox action="/loja/busca" value="" onValueChange={onValueChange} suggestions={[]} />)

    await user.type(screen.getByRole("combobox"), "c")

    expect(onValueChange).toHaveBeenCalledWith("c")
  })

  describe("the scope", () => {
    const LONG = "Suplementos para academia, treino funcional e corrida de rua"
    const scopes = [
      { value: "whey", label: "Whey" },
      { value: "longa", label: LONG },
    ]

    it("reports the scope picked, so the suggestions can follow it", async () => {
      const onScopeChange = vi.fn()
      const { user } = renderBox({ scopes, scope: "", onScopeChange })

      await user.click(screen.getByRole("combobox", { name: "Buscar em" }))
      await user.click(await screen.findByRole("option", { name: "Whey" }))
      expect(onScopeChange).toHaveBeenCalledWith("whey")
    })

    it("sends the scope the screen holds with the search, under `categoria`", () => {
      const { container } = renderBox({ scopes, scope: "whey" })

      expect(container.querySelector('form input[type="hidden"][name="categoria"]')).toHaveValue("whey")
    })

    // The complaint: "Todos" drawn 160px wide because another category has a long name.
    it("keeps the scope to the chosen name's room, capped, with a 60-character category chosen", () => {
      renderBox({ scopes, scope: "longa" })

      const scope = screen.getByRole("combobox", { name: "Buscar em" })
      expect(scope).toHaveClass("max-w-[7rem]", "w-fit", "shrink-0")
      expect(scope).toHaveAttribute("title", LONG)
    })

    it("is titled as the whole shop while no category is chosen", () => {
      renderBox({ scopes, scope: "" })

      expect(screen.getByRole("combobox", { name: "Buscar em" })).toHaveAttribute("title", "Todos")
    })

    // What the #233 fix got right stays: the scope's own list is not the suggestions', and opening it asks nothing.
    it("does not open the suggestions by opening the scope's list, and Enter in the field still searches", async () => {
      const { user } = renderBox({ scopes, scope: "" })
      const field = screen.getByRole("combobox", { name: "Buscar nesta loja" })

      await user.click(screen.getByRole("combobox", { name: "Buscar em" }))
      await screen.findByRole("option", { name: "Whey" })
      expect(field).toHaveAttribute("aria-expanded", "false")
    })
  })

  it("has no accessibility violations, closed and open", async () => {
    const { container, user } = renderBox({ total: 18, seeAllHref: "/loja/busca?q=whey", scopes: [{ value: "whey", label: "Whey" }] })
    await expectNoA11yViolations(container)

    await user.type(screen.getByRole("combobox", { name: "Buscar nesta loja" }), "whey")
    expect(screen.getByRole("listbox")).toBeInTheDocument()
    await expectNoA11yViolations(container)
  })
})
