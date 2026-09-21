// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCategoryGrid } from "./storefront-category-grid"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://cdn/mv.png", productCount: 12 },
  { id: "2", slug: "promocoes", name: "Promoções", imageUrl: null, productCount: 3 },
  { id: "3", slug: "novidades", name: "Novidades", imageUrl: null, productCount: 1 },
]

function renderGrid(overrides: Partial<Parameters<typeof StorefrontCategoryGrid>[0]> = {}) {
  return render(
    <StorefrontCategoryGrid
      categories={categories}
      href={(slug) => `/lessari/categorias/${slug}`}
      {...overrides}
    />,
  )
}

describe("StorefrontCategoryGrid", () => {
  /** A card where only part of it is clickable teaches a visitor that clicking does nothing. */
  it("makes the whole card the link, count and all", () => {
    renderGrid()

    const card = screen.getByRole("link", { name: /Mais vendidos/ })
    expect(card).toHaveAttribute("href", "/lessari/categorias/mais-vendidos")
    expect(within(card).getByText("12 produtos")).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(categories.length)
  })

  /**
   * The route word is the shop's, not ours: a shop switched to EN moves every address at once,
   * and a block that spelled "categorias" anywhere would keep pointing at the old one.
   */
  it("spells no part of the address itself", () => {
    renderGrid({ href: (slug) => `/lessari/categories/${slug}` })

    expect(screen.getByRole("link", { name: /Promoções/ })).toHaveAttribute(
      "href",
      "/lessari/categories/promocoes",
    )
  })

  it("counts what is inside, in the singular when there is one", () => {
    renderGrid()

    expect(screen.getByText("3 produtos")).toBeInTheDocument()
    expect(screen.getByText("1 produto")).toBeInTheDocument()
  })

  /**
   * The name sits beside the photograph, so naming the photograph after the category hands a
   * screen reader the same name twice per card — the defect the product card was fixed for.
   */
  it("announces a category's name once per card, never once per picture", () => {
    renderGrid()

    const card = screen.getByRole("link", {
      name: (accessibleName: string) => accessibleName.split("Mais vendidos").length - 1 === 1,
    })
    expect(within(card).getByText("Mais vendidos")).toBeInTheDocument()
    expect(within(card).queryAllByRole("img")).toHaveLength(0)
  })

  /**
   * There is no panel screen for categories yet, so every `imageUrl` in a real shop is null today
   * — and a page of empty grey squares reads as one that failed to load.
   */
  it("draws an initial for a category with no photograph, without reading it out", () => {
    renderGrid()

    const card = screen.getByRole("link", { name: /Promoções/ })
    expect(within(card).getByText("P")).toBeInTheDocument()
    expect(card).toHaveAccessibleName(/^Promoções/)
  })

  /** A shop is allowed to sell without categories, and this page still has to say something. */
  it("explains itself instead of going blank when the shop has none", () => {
    renderGrid({ categories: [], catalogHref: "/lessari/produtos" })

    expect(
      screen.getByText("Esta loja ainda não separou o que vende em categorias."),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Todos os produtos" })).toHaveAttribute(
      "href",
      "/lessari/produtos",
    )
  })

  it("says nothing more than the sentence when there is nowhere to send them", () => {
    renderGrid({ categories: [] })

    expect(
      screen.getByText("Esta loja ainda não separou o que vende em categorias."),
    ).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderGrid()

    await expectNoA11yViolations(container)
  })
})
