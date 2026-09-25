// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCategories } from "./storefront-categories"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://cdn/mv.png" },
  { id: "2", slug: "promocoes", name: "Promoções", imageUrl: null },
]

function renderCategories(overrides: Partial<Parameters<typeof StorefrontCategories>[0]> = {}) {
  return render(
    <StorefrontCategories
      categories={categories}
      href={(slug) => (slug ? `/lessari?categoria=${slug}` : "/lessari")}
      {...overrides}
    />,
  )
}

describe("StorefrontCategories", () => {
  /**
   * Links, never handlers: the address is what says which catalogue you are looking at, so a
   * filtered shop is bookmarkable, shareable and indexable — and it works with no JavaScript.
   */
  it("filters through the address", () => {
    renderCategories()

    expect(screen.getByRole("link", { name: /Promoções/ })).toHaveAttribute(
      "href",
      "/lessari?categoria=promocoes",
    )
  })

  // Navigation that disappears when you use it is navigation you cannot get back out of.
  it("keeps every category listed while one of them is filtering", () => {
    renderCategories({ active: "promocoes" })

    expect(screen.getByRole("link", { name: /Mais vendidos/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tudo" })).toHaveAttribute("href", "/lessari")
  })

  it("marks the open one for a reader who cannot see the ring", () => {
    renderCategories({ active: "promocoes" })

    expect(screen.getByRole("link", { name: /Promoções/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: /Mais vendidos/ })).not.toHaveAttribute("aria-current")
  })

  it("names Tudo as the page only on the catalogue's own page, never by default", () => {
    const { rerender } = renderCategories()
    expect(screen.getByRole("link", { name: "Tudo" })).not.toHaveAttribute("aria-current")

    rerender(<StorefrontCategories categories={categories} href={() => "/lessari"} allActive />)
    expect(screen.getByRole("link", { name: "Tudo" })).toHaveAttribute("aria-current", "page")
  })

  // A product's category is underlined as 5b draws it, but the product page is not that category's page.
  it("underlines a marked one without calling it the page", () => {
    renderCategories({ marked: "promocoes" })

    const link = screen.getByRole("link", { name: /Promoções/ })
    expect(link).not.toHaveAttribute("aria-current")
    expect(link.style.boxShadow).toContain("var(--shop-primary-on-header)")
    expect(screen.getByRole("link", { name: "Tudo" }).style.boxShadow).toBe("")
  })

  it("ends with the offers, apart, only when the shop has some", () => {
    const { rerender } = renderCategories({ offersHref: "/lessari/produtos?desconto=1" })
    expect(screen.getByRole("link", { name: "Ofertas do dia" })).toHaveAttribute("href", "/lessari/produtos?desconto=1")
    expect(screen.getByRole("link", { name: "Ofertas do dia" }).closest("li")).toHaveClass("ml-auto")

    rerender(<StorefrontCategories categories={categories} href={() => "/lessari"} />)
    expect(screen.queryByRole("link", { name: "Ofertas do dia" })).not.toBeInTheDocument()
  })

  /**
   * The default is the menu, and a menu is words. The shop owner saw the row of circles and said
   * so: a circle is a picture, and no panel screen uploads one, so every shop got a row of single
   * letters where its menu should be.
   */
  it("is a bar of words by default, with no photographs in it", () => {
    const { container } = renderCategories()

    expect(container.querySelectorAll("img")).toHaveLength(0)
    expect(screen.getByRole("link", { name: /Promoções/ })).toBeInTheDocument()
  })

  it("renders nothing at all for a shop with no categories", () => {
    const { container } = renderCategories({ categories: [] })

    expect(container).toBeEmptyDOMElement()
  })

  /**
   * There is no panel screen for categories yet, so every `imageUrl` in a real shop is null today
   * — and a row of empty grey circles reads as a page that failed to load.
   */
  it("draws an initial for a photographless category, in the tile variant", () => {
    const { container } = renderCategories({ variant: "tiles" })

    expect(container.textContent).toContain("P")
    expect(container.querySelectorAll("img")).toHaveLength(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCategories({ active: "promocoes" })

    await expectNoA11yViolations(container)
  })
})
