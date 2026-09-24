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
})
