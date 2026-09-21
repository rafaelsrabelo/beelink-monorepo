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

  /**
   * There is no panel screen for categories yet, so every `imageUrl` in a real shop is null today
   * — and a row of empty grey circles reads as a page that failed to load.
   */
  it("draws an initial for a category with no photograph", () => {
    const { container } = renderCategories()

    expect(container.textContent).toContain("P")
    expect(container.querySelectorAll("img")).toHaveLength(1)
  })

  it("renders nothing at all for a shop with no categories", () => {
    const { container } = renderCategories({ categories: [] })

    expect(container).toBeEmptyDOMElement()
  })

  it("can be chips instead of tiles", () => {
    const { container } = renderCategories({ withImages: false })

    expect(container.querySelectorAll("img")).toHaveLength(0)
    expect(screen.getByRole("link", { name: /Promoções/ })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCategories({ active: "promocoes" })

    await expectNoA11yViolations(container)
  })
})
