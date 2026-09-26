// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSearch } from "./storefront-search"

function renderSearch(overrides: Partial<Parameters<typeof StorefrontSearch>[0]> = {}) {
  return render(<StorefrontSearch action="/padaria-da-ana/busca" {...overrides} />)
}

describe("StorefrontSearch", () => {
  /**
   * The shop is crawled and its results are pasted into WhatsApp. A term that lives in component
   * state leaves nothing behind to paste, and nothing at all before JavaScript arrives.
   */
  it("asks for results through the address, and leaves the page it is on", () => {
    renderSearch()
    const form = screen.getByRole("search")

    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/padaria-da-ana/busca")
  })

  // `/<shop>/busca?q=` and `/<shop>/search?q=` are one address in two languages: the word in the
  // path is the shop's, the key the term travels under is the contract's.
  it("sends the term under `q`, whatever the shop calls the page", () => {
    renderSearch()
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "q")
  })

  it("takes another key when a screen has one", () => {
    renderSearch({ name: "termo" })
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "termo")
  })

  /** A placeholder is gone the moment someone types, so it cannot be the only name (WCAG 3.3.2). */
  it("names the field with a sentence typing cannot erase", () => {
    renderSearch()
    const field = screen.getByRole("searchbox", { name: "Buscar nesta loja" })

    expect(field).toHaveAttribute("placeholder", "O que você procura?")
    expect(field.getAttribute("placeholder")).not.toBe("Buscar nesta loja")
  })

  it("says back what was asked for, so a results page is not an empty field", () => {
    renderSearch({ value: "bolo" })
    expect(screen.getByRole("searchbox")).toHaveValue("bolo")
  })

  it("starts empty when nothing was asked for", () => {
    renderSearch()
    expect(screen.getByRole("searchbox")).toHaveValue("")
  })

  // Enter submits only where a submit button exists, and the button has to say what it does:
  // "button" is not an answer for someone who cannot see the magnifying glass.
  it("submits without JavaScript, from a button that names itself", () => {
    renderSearch()
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute("type", "submit")
  })

  describe("the fields pinned to it", () => {
    it("pins nothing when the screen pinned nothing", () => {
      const { container } = renderSearch()
      expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0)
    })

    it("carries what the screen pinned, so the term does not travel alone", () => {
      const { container } = renderSearch({ hidden: { categoria: "promocoes" } })
      expect(container.querySelector('input[name="categoria"]')).toHaveValue("promocoes")
    })
  })

  describe("the caret", () => {
    /** The header's search is on every page; one that grabs the caret hijacks every arrival. */
    it("stays where the visitor left it", () => {
      renderSearch()
      expect(screen.getByRole("searchbox")).not.toHaveFocus()
    })

    it("goes to the field on a page whose whole purpose is the search", () => {
      renderSearch({ autoFocus: true })
      expect(screen.getByRole("searchbox")).toHaveFocus()
    })
  })

  describe("the scope", () => {
    const scopes = [
      { value: "whey", label: "Whey" },
      { value: "creatina", label: "Creatina" },
    ]

    it("offers the whole shop first, then each category, under the key the catalogue reads", () => {
      renderSearch({ scopes })

      const select = screen.getByRole("combobox", { name: "Buscar em" })
      expect(select).toHaveAttribute("name", "categoria")
      expect([...select.querySelectorAll("option")].map((option) => option.textContent)).toEqual(["Todos", "Whey", "Creatina"])
      expect(select).toHaveValue("")
    })

    it("opens on the category whose page this is", () => {
      renderSearch({ scopes, scope: "creatina" })

      expect(screen.getByRole("combobox", { name: "Buscar em" })).toHaveValue("creatina")
    })

    // A select is as wide as its longest option: a long category name squeezed the field to nothing.
    it("never takes more than 40% of the bar, whatever the longest category is called", () => {
      renderSearch({ scopes: [{ value: "a", label: "Acessórios para academia e treino funcional" }] })

      expect(screen.getByRole("combobox", { name: "Buscar em" })).toHaveClass("max-w-[40%]")
    })

    it("draws no select when there is nothing to narrow to", () => {
      renderSearch()

      expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    })
  })

  it("renders in English when the screen hands it the English dictionary", () => {
    renderSearch({ action: "/ana-bakery/search", messages: en })

    expect(screen.getByRole("searchbox", { name: "Search this shop" })).toHaveAttribute(
      "placeholder",
      "What are you looking for?",
    )
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontSearch
        action="/padaria-da-ana/busca"
        value="bolo"
        hidden={{ categoria: "promocoes" }}
      />,
    )

    await expectNoA11yViolations(container)
  })
})
