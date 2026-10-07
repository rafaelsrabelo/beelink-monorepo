// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCategoryRail } from "./storefront-category-rail"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://cdn/mv.png", productCount: 12 },
  { id: "2", slug: "promocoes", name: "Promoções", imageUrl: null, productCount: 3 },
]

function renderRail(overrides: Partial<Parameters<typeof StorefrontCategoryRail>[0]> = {}) {
  return render(
    <StorefrontCategoryRail
      categories={categories}
      href={(slug) => `/lessari/categorias/${slug}`}
      label="Categorias"
      {...overrides}
    />,
  )
}

describe("StorefrontCategoryRail", () => {
  it("runs the categories on one row that scrolls, named after the block", () => {
    renderRail()

    const rail = screen.getByRole("group", { name: "Categorias" })
    expect(within(rail).getAllByRole("listitem")).toHaveLength(2)
    expect(rail.className).toContain("snap-x")
  })

  it("draws the grid's card, the whole of it the link", () => {
    renderRail()

    expect(screen.getByRole("link", { name: /Mais vendidos/ })).toHaveAttribute("href", "/lessari/categorias/mais-vendidos")
  })

  it("answers to the shop's categories when the block has no title", () => {
    renderRail({ label: undefined })

    expect(screen.getByRole("group", { name: "Categorias da loja" })).toBeInTheDocument()
  })

  it("says the grid's sentence, and opens the catalogue, when there is none", () => {
    renderRail({ categories: [], catalogHref: "/lessari/produtos" })

    expect(screen.queryByRole("group")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Todos os produtos" })).toHaveAttribute("href", "/lessari/produtos")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderRail()

    await expectNoA11yViolations(container)
  })

  describe("drawn as the artwork alone", () => {
    it("draws the picture and nothing else, and the link answers to the category's name", () => {
      renderRail({ cardStyle: "ART_ONLY" })

      const card = screen.getByRole("link", { name: "Mais vendidos" })
      expect(card).toHaveAttribute("href", "/lessari/categorias/mais-vendidos")
      expect(within(card).getByRole("img", { name: "Mais vendidos" })).toHaveAttribute("src", "https://cdn/mv.png")
      // Nothing written with it: no name under the picture, no count.
      expect(card).toHaveTextContent("")
      expect(card.className).toContain("aspect-square")
      expect(card.className).toContain("focus-visible:outline-2")
      expect(card.className).toContain("rounded-xl")
    })

    it("draws a category with no picture as the card with its name, never an empty square", () => {
      renderRail({ cardStyle: "ART_ONLY" })

      const card = screen.getByRole("link", { name: /Promoções/ })
      expect(within(card).getByText("Promoções")).toBeInTheDocument()
      expect(within(card).getByText("3 produtos")).toBeInTheDocument()
      expect(screen.getAllByRole("link")).toHaveLength(categories.length)
    })

    it("has no accessibility violations", async () => {
      const { container } = renderRail({ cardStyle: "ART_ONLY" })

      await expectNoA11yViolations(container)
    })
  })

  it("writes the name with the photograph unless told otherwise", () => {
    renderRail()

    const card = screen.getByRole("link", { name: /Mais vendidos/ })
    expect(within(card).getByText("Mais vendidos")).toBeInTheDocument()
    expect(within(card).getByText("12 produtos")).toBeInTheDocument()
  })
})
