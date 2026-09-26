// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCategoryChips } from "./storefront-category-chips"

const categories = [
  { id: "1", slug: "vestidos", name: "Vestidos", imageUrl: null, productCount: 4 },
  { id: "2", slug: "blusas", name: "Blusas", imageUrl: null, productCount: 2 },
]

describe("StorefrontCategoryChips", () => {
  it("lists every category by name, each a link to its page", () => {
    render(<StorefrontCategoryChips categories={categories} href={(slug) => `/loja/categorias/${slug}`} label="Compre por categoria" />)

    expect(screen.getByRole("list", { name: "Compre por categoria" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Blusas" })).toHaveAttribute("href", "/loja/categorias/blusas")
  })

  it("draws nothing without categories", () => {
    const { container } = render(<StorefrontCategoryChips categories={[]} href={(slug) => slug} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCategoryChips categories={categories} href={(slug) => slug} />)

    await expectNoA11yViolations(container)
  })
})
